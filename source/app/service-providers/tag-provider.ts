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

import fs from 'fs'
import path from 'path'
import { app, ipcMain } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { ColouredTag, TagDatabase } from '@dts/common/tag-provider'

interface InternalTagRecord {
  text: string
  files: string[]
  className: string
}

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class TagProvider {
  private readonly _file: string
  private _colouredTags: ColouredTag[]
  private readonly _globalTagDatabase: Map<string, InternalTagRecord>
  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor () {
    global.log.verbose('Tag provider booting up ...')
    this._file = path.join(app.getPath('userData'), 'tags.json')
    this._colouredTags = []
    // The global tag database; it contains all tags that are used in any of the
    // files.
    this._globalTagDatabase = new Map()

    this._load()

    // Register a global helper for the tag database
    global.tags = {
      /**
       * Adds an array of tags to the database
       * @param  {string[]} tagArray An array containing the tags to be added
       * @return {void}          Does not return.
       */
      report: (tagArray: string[], filePath: string) => {
        for (let tag of tagArray) {
          // Either init or modify accordingly
          const record = this._globalTagDatabase.get(tag)
          if (record === undefined) {
            const cInfo = this._colouredTags.find(e => e.name === tag)
            const newRecord: InternalTagRecord = {
              text: tag,
              files: [filePath],
              className: (cInfo !== undefined) ? 'cm-hint-colour' : ''
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
      },
      /**
       * Removes the given tagArray from the database, i.e. decreases the
       * counter until zero and then removes the tag.
       * @param  {string[]} tagArray The tags to remove from the database
       * @return {void}          Does not return.
       */
      remove: (tagArray: string[], filePath: string) => {
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
      },
      /**
       * Returns the global tag database
       * @return {TagDatabase} An object containing all tags.
       */
      getTagDatabase: () => {
        return this._getSimplifiedTagDatabase()
      },
      /**
       * Returns the special (= coloured) tags
       * @param  {string} name An optional name to get one. Otherwise, will return all.
       * @return {ColouredTag[]}      The special tag array.
       */
      getColouredTags: () => {
        return this._colouredTags
      },
      /**
       * Updates the special tags with an array of new ones.
       * @param  {any[]} newTags An array containing the tags to be set.
       * @return {boolean} True if all succeeded, false if at least one failed.
       */
      setColouredTags: (newTags: ColouredTag[]) => {
        this.setColouredTags(newTags)
      }
    }

    ipcMain.handle('tag-provider', (event, message) => {
      const { command } = message

      if (command === 'get-tags-database') {
        return this._getSimplifiedTagDatabase()
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

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  async shutdown (): Promise<boolean> {
    global.log.verbose('Tag provider shutting down ...')
    this._save()
    return true
  }

  /**
   * This function only (re-)reads the tags on disk.
   * @return {ZettlrTags} This for chainability.
   */
  _load (): TagProvider {
    // We are not checking if the user directory exists, b/c this file will
    // be loaded after the ZettlrConfig, which makes sure the dir exists.

    // Does the file already exist?
    try {
      fs.lstatSync(this._file)
      this._colouredTags = JSON.parse(fs.readFileSync(this._file, { encoding: 'utf8' }))
    } catch (err) {
      fs.writeFileSync(this._file, JSON.stringify([]), { encoding: 'utf8' })
      return this // No need to iterate over objects anymore
    }

    return this
  }

  /**
   * Simply writes the tag data to disk.
   * @return {ZettlrTags} This for chainability.
   */
  _save (): TagProvider {
    // (Over-)write the tags
    fs.writeFileSync(this._file, JSON.stringify(this._colouredTags), { encoding: 'utf8' })

    return this
  }

  /**
   * Updates all tags (i.e. replaces them)
   * @param  {ColouredTag[]} tags The new tags as an array
   */
  setColouredTags (tags: ColouredTag[]): void {
    this._colouredTags = tags
    this._save()
    broadcastIpcMessage('coloured-tags')
  }

  /**
   * Returns a simplified version of the internal tag database for external use.
   *
   * @return  {TagDatabase}  The database
   */
  _getSimplifiedTagDatabase (): TagDatabase {
    const ret: TagDatabase = {}
    for (const [ tag, record ] of this._globalTagDatabase.entries()) {
      ret[tag] = {
        text: record.text,
        count: record.files.length,
        className: record.className
      }
    }
    return ret
  }
}
