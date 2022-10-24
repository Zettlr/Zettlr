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

import path from 'path'
import { app, ipcMain } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { ColouredTag, TagDatabase } from '@dts/common/tag-provider'
import ProviderContract from '../provider-contract'
import LogProvider from '../log'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import FSAL from '@providers/fsal'

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
  private readonly container: PersistentDataContainer
  private _colouredTags: ColouredTag[]
  private readonly _globalTagDatabase: Map<string, InternalTagRecord>
  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (private readonly _logger: LogProvider, private readonly _fsal: FSAL) {
    super()
    this._file = path.join(app.getPath('userData'), 'tags.json')
    this._colouredTags = []
    this.container = new PersistentDataContainer(this._file, 'json')
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
        const wantedTags: string[] = message.payload
        const allTags = this._fsal.collectTags().filter(record => wantedTags.includes(record[0]))
        // We cannot use a Map for the return value since Maps are not JSONable.
        const ret: { [key: string]: string[] } = {}

        for (const [ tag, files ] of allTags) {
          for (const file of files) {
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
    this._logger.verbose('Tag provider booting up ...')
    if (!await this.container.isInitialized()) {
      await this.container.init([])
    } else {
      this.setColouredTags(await this.container.get())
    }
  }

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Tag provider shutting down ...')
    this.container.shutdown()
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
    this.container.set(this._colouredTags)
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
    for (const [ tag, files ] of this._fsal.collectTags()) {
      const cInfo = this._colouredTags.find(e => e.name === tag)
      ret[tag] = {
        text: tag,
        count: files.length,
        className: (cInfo !== undefined) ? 'cm-hint-colour' : ''
      }
    }
    return ret
  }
}
