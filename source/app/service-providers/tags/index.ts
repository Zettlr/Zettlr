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
 *                  The provider basically provides the "weaving together" of
 *                  the existing tags within the files loaded in the app and the
 *                  "special" tags that have a color assigned. The provider
 *                  always receives just all tags, and makes sure to disentangle
 *                  and enrich the colors from the "normal" tags as they pass
 *                  through it.
 *
 * END HEADER
 */

import path from 'path'
import { app, ipcMain } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import type WorkspaceProvider from '@providers/workspaces'
import type DocumentManager from '../documents'
import { DP_EVENTS } from '@dts/common/documents'

/**
 * This interface describes a single tag within the files loaded in here.
 */
export interface TagRecord {
  /**
   * The tag's name, e.g., #todo
   */
  name: string
  /**
   * A list of absolute paths to files which share this tag
   */
  files: string[]
  /**
   * The IDF score of this tag (idf = Math.log(N / files.length))
   */
  idf: number
  /**
   * An optional color for this tag
   */
  color?: string
  /**
   * An optional description for thist ag
   */
  desc?: string
}

export interface ColoredTag {
  name: string
  color: string
  desc: string
}

/**
 * This class manages the colored tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class TagProvider extends ProviderContract {
  private readonly _file: string
  private readonly container: PersistentDataContainer<ColoredTag[]>
  private _coloredTags: ColoredTag[]
  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (
    private readonly _logger: LogProvider,
    private readonly _docs: DocumentManager,
    private readonly _workspaces: WorkspaceProvider
  ) {
    super()
    this._file = path.join(app.getPath('userData'), 'tags.json')
    this._coloredTags = []
    this.container = new PersistentDataContainer(this._file, 'json')

    ipcMain.handle('tag-provider', (event, message) => {
      const { command } = message

      if (command === 'get-all-tags') {
        return this.getAllTags()
      } else if (command === 'set-colored-tags') {
        const { payload } = message
        this.setColoredTags(payload)
      } else if (command === 'get-colored-tags') {
        return this._coloredTags
      }
    })
  }

  async boot (): Promise<void> {
    this._logger.verbose('Tag provider booting up ...')
    if (!await this.container.isInitialized()) {
      await this.container.init([])
    } else {
      this.setColoredTags(
        (await this.container.get()).filter((tag) => tag !== undefined)
      )
    }

    this._docs.on(DP_EVENTS.FILE_SAVED, () => {
      // TODO: This is somewhat of a workaround for #5140. I tested how long
      // this function would take on a reasonably large workspace (=my own), and
      // it took about 1.5ms to collect all tags. So whenever a file is saved
      // here we just emit a tag change event without checking if this actually
      // changed. I think it's okay to do so, but in the future we may need to
      // add a sanity check before simply emitting this event, especially if we
      // do something to make the `getAllTags` method take significantly longer.
      broadcastIpcMessage('tag-provider', 'tags-updated', this.getAllTags())
    })
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
   *
   * @param  {ColoredTag[]} tags The new tags as an array
   */
  setColoredTags (tags: ColoredTag[]): void {
    // First, remove anything that doesn't have a color set
    tags = tags.filter(tag => tag.color !== undefined && tag.desc !== undefined)

    const uniqueTags: ColoredTag[] = []
    for (const tag of tags) {
      const hasTag = uniqueTags.find(elem => elem.name === tag.name)
      if (hasTag === undefined) {
        uniqueTags.push({ name: tag.name, color: tag.color as string, desc: tag.desc as string })
      }
    }

    this._coloredTags = uniqueTags
    this.container.set(this._coloredTags)
    broadcastIpcMessage('tag-provider', 'colored-tags-updated', this.getColoredTags())
    broadcastIpcMessage('tag-provider', 'tags-updated', this.getAllTags())
  }

  /**
   * Returns the special (= colored) tags
   *
   * @return  {ColoredTag[]}  The special tag array.
   */
  getColoredTags (): ColoredTag[] {
    return this._coloredTags
  }

  /**
   * Returns a simplified version of the internal tag database for external use.
   *
   * @return  {TagRecord[]}  The database
   */
  getAllTags (): TagRecord[] {
    const ret: TagRecord[] = []
    const tagDb = this._workspaces.getTags()

    const tagToFileMap = new Map()
    for (const [ file, tags ] of [...tagDb]) {
      for (const tag of tags) {
        const entry = tagToFileMap.get(tag)
        if (entry === undefined) {
          tagToFileMap.set(tag, [file])
        } else {
          tagToFileMap.set(tag, [ ...entry, file ])
        }
      }
    }

    for (const [ name, files ] of tagToFileMap) {
      const tagColor = this._coloredTags.find(c => c.name === name)
      ret.push({ name, files, color: tagColor?.color, desc: tagColor?.desc, idf: 0 })
    }

    // Calculate idf based on the info we have for each tag
    const N = ret.map(x => x.files.length).reduce((prev, cur) => prev + cur, 0)
    for (const tag of ret) {
      tag.idf = Math.log(N / tag.files.length)
    }

    // Before returning, make sure to sort the tags by count
    ret.sort((a, b) => { return b.files.length - a.files.length })
    return ret
  }
}
