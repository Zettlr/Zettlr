/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LinkProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles links back and forth
 *
 * END HEADER
 */

import { ipcMain } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { extractFromFileDescriptors } from '@common/util/extract-from-file-descriptors'
import { hasMarkdownExt, MD_EXT } from '@common/util/file-extention-checks'
import { getIDRE } from '@common/regular-expressions'
import ProviderContract from '../provider-contract'
import type LogProvider from '@providers/log'
import path from 'path'
import type FSAL from '../fsal'
import type ConfigProvider from '../config'

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class LinkProvider extends ProviderContract {
  private _fileLinkDatabase: Map<string, string[]>
  private _idDatabase: Map<string, string>

  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (private readonly _logger: LogProvider, private readonly _config: ConfigProvider, private readonly _fsal: FSAL) {
    super()

    this._fileLinkDatabase = new Map()
    this._idDatabase = new Map()
    // TODO: Add a set of duplicate IDs so we can inform the user so they can
    // fix this

    ipcMain.handle('link-provider', async (event, message) => {
      const { command } = message

      if (command === 'get-inbound-links') {
        // Return whatever links to the given file
        const filePath: string = message.payload.filePath
        return {
          inbound: this.retrieveInbound(filePath),
          outbound: await this.retrieveOutbound(filePath)
        }
      } else if (command === 'get-link-database') {
        // NOTE: We need to compact the Map into something JSONable
        return Object.fromEntries(this._fileLinkDatabase)
      }
    })
  }

  public async boot (): Promise<void> {
    // Listen to state changes within the Workspaces Provider
    this._fsal.on('fsal-event', () => {
      // Some workspace has changed, so simply pull in the new map
      this.reindex().catch(err => this._logger.error(`[LinkProvider] Could not update link and ID database: ${err.message}`, err))
      // TODO: That can actually be determined fully with the workspaces events
      // i.e., we don't have to emit this here!
      broadcastIpcMessage('links')
    })

    // Pull in the initial update
    await this.reindex()
  }

  /**
   * Reindexes the entire link database.
   */
  private async reindex () {
    const allDescriptors = (await this._fsal.getAllLoadedDescriptors())
      .filter(descriptor => descriptor.type === 'file')

    this._fileLinkDatabase = new Map(extractFromFileDescriptors(allDescriptors, 'links'))
    this._idDatabase = new Map(extractFromFileDescriptors(allDescriptors, 'id'))
  }

  /**
   * Shuts down the service provider
   * @return {Boolean} Returns true after successful shutdown
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Link provider shutting down ...')
  }

  /**
   * Retrieves a set of links to the file given as argument
   *
   * @param   {string}    sourceFilePath  The source file's path
   *
   * @return  {string[]}                  A list of all files linking to sourceFile
   */
  retrieveInbound (sourceFilePath: string): string[] {
    const id = this._idDatabase.get(sourceFilePath)

    if (id === undefined) {
      return [] // Not part of the ID map
    }

    const sourceFiles: string[] = []

    const linkWithExt = path.basename(sourceFilePath)
    const linkWoExt = path.basename(sourceFilePath, path.extname(sourceFilePath))

    // Search all recorded links
    for (const [ file, outbound ] of this._fileLinkDatabase.entries()) {
      if (outbound.includes(id) || outbound.includes(linkWithExt) || outbound.includes(linkWoExt)) {
        sourceFiles.push(file)
      }
    }

    return sourceFiles
  }

  /**
   * Retrieves a set of files the given source file links to
   *
   * @param   {string}    sourceFilePath  The source file's path
   *
   * @return  {string[]}                  A list of outbound links from source
   */
  async retrieveOutbound (sourceFilePath: string): Promise<string[]> {
    const dbLinks = this._fileLinkDatabase.get(sourceFilePath)
    if (dbLinks === undefined) {
      return []
    }

    const outboundLinks: string[] = []

    const { zkn } = this._config.get()
    const idRe = getIDRE(zkn.idRE, true)

    const loadedDescriptors = (await this._fsal.getAllLoadedDescriptors())
      .filter(descriptor => descriptor.type === 'file')

    const findExact = async (query: string) => {
      for (const descriptor of loadedDescriptors) {
        if (idRe.test(query) && descriptor.id === query) {
          return descriptor
        }

        if (hasMarkdownExt(query) && descriptor.name === query) {
          return descriptor
        }

        for (const type of MD_EXT) {
          if (descriptor.name === query + type) {
            return descriptor
          }
        }
      }
    }

    for (const link of dbLinks) {
      const descriptor = await findExact(link)

      if (descriptor !== undefined) {
        outboundLinks.push(descriptor.path)
      }
    }

    return outboundLinks
  }
}
