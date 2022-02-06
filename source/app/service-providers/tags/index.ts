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
import ProviderContract from '../provider-contract'
import LogProvider from '../log'

interface InternalTagRecord {
  text: string
  files: string[]
  className: string
}

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class TagProvider extends ProviderContract {
  private readonly _file: string
  private _colouredTags: ColouredTag[]
  private readonly _globalTagDatabase: Map<string, InternalTagRecord>
  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (private readonly _logger: LogProvider) {
    super()
    this._logger.verbose('Tag provider booting up ...')
    this._file = path.join(app.getPath('userData'), 'tags.json')
    this._colouredTags = []
    // The global tag database; it contains all tags that are used in any of the
    // files.
    this._globalTagDatabase = new Map()

    ipcMain.handle('tag-provider', (event, message) => {
      const { command } = message

      if (command === 'get-tags-database') {
        return this.getTagDatabase()
      } else if (command === 'set-coloured-tags') {
        const { payload } = message
        this.setColouredTags(payload)
      } else if (command === 'get-coloured-tags') {
        return this._colouredTags
      } else if (command === 'recommend-matching-files') {
        const { payload } = message
        // We cannot use a Map for the return value since Maps are not JSONable.
        const ret: { [key: string]: string[] } = {}

        for (const tag of payload) {
          const record = this._globalTagDatabase.get(tag)
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

  async boot (): Promise<void> {
    try {
      await fs.lstat(this._file)
      const content = await fs.readFile(this._file, { encoding: 'utf8' })
      this.setColouredTags(JSON.parse(content))
    } catch (err) {
      await fs.writeFile(this._file, JSON.stringify([]), { encoding: 'utf8' })
    }
  }

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Tag provider shutting down ...')
    await this._save()
  }

  /**
   * Adds an array of tags to the database
   * @param  {string[]} tagArray An array containing the tags to be added
   * @return {void}          Does not return.
   */
  report (tagArray: string[], filePath: string): void {
    for (let tag of tagArray) {
      // Either init or modify accordingly
      const record = this._globalTagDatabase.get(tag)
      if (record === undefined) {
        const newRecord: InternalTagRecord = {
          text: tag,
          files: [filePath],
          className: ''
        }

        this._globalTagDatabase.set(tag, newRecord)
        // Set a special class to all tags that have a highlight colour
      } else {
        if (!record.files.includes(filePath)) {
          record.files.push(filePath)
        }
      }
    }

    broadcastIpcMessage('tags')
  }

  /**
   * Removes the given tagArray from the database, i.e. decreases the
   * counter until zero and then removes the tag.
   * @param  {string[]} tagArray The tags to remove from the database
   * @return {void}          Does not return.
   */
  remove (tagArray: string[], filePath: string): void {
    for (let tag of tagArray) {
      const record = this._globalTagDatabase.get(tag)
      if (record !== undefined) {
        const idx = record.files.indexOf(filePath)
        if (idx > -1) {
          record.files.splice(idx, 1)
        }

        // Remove the tag altogether if its count is zero.
        if (record.files.length === 0) {
          this._globalTagDatabase.delete(tag)
        }
      }
    }

    broadcastIpcMessage('tags')
  }

  /**
   * Simply writes the tag data to disk.
   * @return {ZettlrTags} This for chainability.
   */
  async _save (): Promise<void> {
    // (Over-)write the tags
    await fs.writeFile(this._file, JSON.stringify(this._colouredTags), { encoding: 'utf8' })
  }

  /**
   * Updates all tags (i.e. replaces them)
   * @param  {ColouredTag[]} tags The new tags as an array
   */
  setColouredTags (tags: ColouredTag[]): void {
    const uniqueTags: ColouredTag[] = []
    for (const tag of tags) {
      const hasTag = uniqueTags.find(elem => elem.name === tag.name)
      if (hasTag === undefined) {
        uniqueTags.push(tag)
      }
    }

    this._colouredTags = uniqueTags
    this._save()
      .catch((err: any) => {
        this._logger.error(`[Tag Provider] Could not write tags to disk: ${err.message as string}`, err)
      })
    broadcastIpcMessage('coloured-tags')
    // Necessary so that, e.g., the autocomplete list, receives a tag database
    // with the correct class names applied, since the className property is
    // injected in getTagDatabase()
    broadcastIpcMessage('tags')
  }

  /**
   * Returns the special (= coloured) tags
   * @param  {string} name An optional name to get one. Otherwise, will return all.
   * @return {ColouredTag[]}      The special tag array.
   */
  getColouredTags (): ColouredTag[] {
    return this._colouredTags
  }

  /**
   * Returns a simplified version of the internal tag database for external use.
   *
   * @return  {TagDatabase}  The database
   */
  getTagDatabase (): TagDatabase {
    const ret: TagDatabase = {}
    for (const [ tag, record ] of this._globalTagDatabase.entries()) {
      const cInfo = this._colouredTags.find(e => e.name === tag)
      ret[tag] = {
        text: record.text,
        count: record.files.length,
        className: (cInfo !== undefined) ? 'cm-hint-colour' : ''
      }
    }
    return ret
  }
}
