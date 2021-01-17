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
import broadcastIpcMessage from '../../common/util/broadcast-ipc-message'

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class TagProvider {
  private readonly _file: string
  private _colouredTags: ColouredTag[]
  private _globalTagDatabase: TagDatabase
  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor () {
    global.log.verbose('Tag provider booting up ...')
    this._file = path.join(app.getPath('userData'), 'tags.json')
    this._colouredTags = []
    // The global tag database; it contains all tags that are used in any of the
    // files.
    this._globalTagDatabase = Object.create(null)

    this._load()

    // Register a global helper for the tag database
    global.tags = {
      /**
       * Adds an array of tags to the database
       * @param  {string[]} tagArray An array containing the tags to be added
       * @return {void}          Does not return.
       */
      report: (tagArray: string[]) => {
        for (let tag of tagArray) {
          // Either init with one or increment the tag counter.
          if (this._globalTagDatabase[tag] === undefined) {
            this._globalTagDatabase[tag] = {
              text: tag,
              count: 1,
              className: ''
            }
            let cInfo = this._colouredTags.find(e => e.name === tag)
            // Set a special class to all tags that have a highlight colour
            this._globalTagDatabase[tag].className = (cInfo !== undefined) ? 'cm-hint-colour' : ''
          } else {
            this._globalTagDatabase[tag].count += 1
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
      remove: (tagArray: string[]) => {
        for (let tag of tagArray) {
          if (this._globalTagDatabase[tag] !== undefined) {
            this._globalTagDatabase[tag].count--
          }
          // Remove the tag altogether if its count is zero.
          if (this._globalTagDatabase[tag].count <= 0) {
            delete this._globalTagDatabase[tag]
          }
        }

        broadcastIpcMessage('tags')
      },
      /**
       * Returns the global tag database
       * @return {TagDatabase} An object containing all tags.
       */
      getTagDatabase: () => {
        return this._globalTagDatabase
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

    ipcMain.handle('tag-provider', (event, payload) => {
      const { command } = payload

      if (command === 'get-tags-database') {
        return this._globalTagDatabase
      } else if (command === 'set-coloured-tags') {
        const { colouredTags } = payload
        this.setColouredTags(colouredTags)
      } else if (command === 'get-coloured-tags') {
        return this._colouredTags
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
    } catch (e) {
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
}
