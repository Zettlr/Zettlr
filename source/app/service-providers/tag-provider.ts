/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles everything tag related that's going on in the app.
 *
 * END HEADER
 */

import { promises as fs } from 'fs'
import path from 'path'
import { app, ipcMain } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { ColouredTag, TagDatabase } from '@dts/common/tag-provider'

interface InternalTagRecord {
  text: string
  files: string[]
  className: string
}

// Internal module state
const colouredTags: Set<ColouredTag> = new Set()
const globalTagDatabase: Map<string, InternalTagRecord> = new Map()

// Internal functions
function getTagsFile (): string {
  return path.join(app.getPath('userData'), 'tags.json')
}

async function save (): Promise<void> {
  await fs.writeFile(getTagsFile(), JSON.stringify([...colouredTags]), { encoding: 'utf8' })
}

// General functions (boot/shutdown)
export async function boot (): Promise<void> {
  global.log.verbose('Tag provider booting up ...')
  const filePath = getTagsFile()

  try {
    await fs.lstat(filePath)
    const fileContents = await fs.readFile(filePath, { encoding: 'utf8' })
    const fileArray: any[] = JSON.parse(fileContents)
    // The next line will throw an error if the file contents are not an array,
    // so we can focus on filtering invalid elements
    fileArray.forEach(elem => {
      if (typeof elem.name === 'string' &&
          typeof elem.color === 'string' &&
          typeof elem.desc === 'string'
      ) {
        colouredTags.add(elem)
      }
    })
  } catch (err: any) {
    global.log.error(`[Tag Provider] Couldn't load colored tags from disk: ${err.message as string}`, err)
    await fs.writeFile(filePath, JSON.stringify([]), { encoding: 'utf8' })
  }

  ipcMain.handle('tag-provider', (event, message) => {
    const { command } = message

    if (command === 'get-tags-database') {
      return getTagDatabase()
    } else if (command === 'set-colored-tags') {
      const { payload } = message
      setColoredTags(payload)
    } else if (command === 'get-colored-tags') {
      return getColoredTags()
    } else if (command === 'recommend-matching-files') {
      const { payload } = message
      // We cannot use a Map for the return value since Maps are not JSONable.
      const ret: { [key: string]: string[] } = {}

      for (const tag of payload) {
        const record = globalTagDatabase.get(tag)
        if (record === undefined) {
          continue
        }

        for (const file of record.files) {
          if (ret[file] === undefined) {
            ret[file] = [tag]
          } else if (!ret[file].includes(tag)) {
            ret[file].push(tag)
          }
        }
      }

      return ret
    }
  })
}

export async function shutdown (): Promise<void> {
  global.log.verbose('Tag provider shutting down ...')
  await save()
}

// Public functions

/**
 * Adds an array of tags to the database
 *
 * @param  {string[]} tagArray An array containing the tags to be added
 */
export function reportTags (tagArray: string[], filePath: string): void {
  for (let tag of tagArray) {
    // Either init or modify accordingly
    const record = globalTagDatabase.get(tag)
    if (record === undefined) {
      const cInfo = [...colouredTags].find(e => e.name === tag)
      const newRecord: InternalTagRecord = {
        text: tag,
        files: [filePath],
        className: (cInfo !== undefined) ? 'cm-hint-colour' : ''
      }

      globalTagDatabase.set(tag, newRecord)
      // Set a special class to all tags that have a highlight colour
    } else if (!record.files.includes(filePath)) {
      record.files.push(filePath)
    }
  }

  broadcastIpcMessage('tags')
}

/**
 * Removes the given tagArray from the database, i.e. decreases the
 * counter until zero and then removes the tag.
 *
 * @param  {string[]} tagArray The tags to remove from the database
 *
 * @return {void}          Does not return.
 */
export function removeTags (tagArray: string[], filePath: string): void {
  for (let tag of tagArray) {
    const record = globalTagDatabase.get(tag)
    if (record !== undefined) {
      const idx = record.files.indexOf(filePath)
      if (idx > -1) {
        record.files.splice(idx, 1)
      }

      // Remove the tag altogether if its count is zero.
      if (record.files.length === 0) {
        globalTagDatabase.delete(tag)
      }
    }
  }

  broadcastIpcMessage('tags')
}

/**
 * Returns the collection of colored tags
 *
 * @return  {ColouredTag[]}  The colored tags
 */
export function getColoredTags (): ColouredTag[] {
  return [...colouredTags]
}

/**
 * Updates all tags (i.e. replaces them)
 * @param  {ColouredTag[]} tags The new tags as an array
 */
export function setColoredTags (tags: ColouredTag[]): void {
  colouredTags.clear()
  tags.forEach(tag => colouredTags.add(tag))
  save().catch((err: any) => global.log.error(`[Link Provider] Could not persist colored tags: ${err.message as string}`, err))
  broadcastIpcMessage('colored-tags')
}

/**
   * Returns a simplified version of the internal tag database for external use.
   *
   * @return  {TagDatabase}  The database
   */
export function getTagDatabase (): TagDatabase {
  const ret: TagDatabase = {}
  for (const [ tag, record ] of globalTagDatabase.entries()) {
    ret[tag] = {
      text: record.text,
      count: record.files.length,
      className: record.className
    }
  }
  return ret
}
