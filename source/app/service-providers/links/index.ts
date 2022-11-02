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
import ProviderContract from '../provider-contract'
import FSAL from '@providers/fsal'
import LogProvider from '@providers/log'

/**
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
 */
export default class LinkProvider extends ProviderContract {
  private readonly _fileLinkDatabase: Map<string, string[]>
  private _fsalHistoryTimestamp: number

  /**
   * Create the instance on program start and initially load the tags.
   */
  constructor (private readonly _logger: LogProvider, private readonly _fsal: FSAL) {
    super()

    this._fileLinkDatabase = new Map()
    this._fsalHistoryTimestamp = 0
    // TODO: Add a set of duplicate IDs so we can inform the user so they can
    // fix this

    ipcMain.handle('link-provider', (event, message) => {
      const { command } = message

      if (command === 'get-inbound-links') {
        // Return whatever links to the given file
        const { filePath } = message.payload
        return {
          inbound: this.retrieveInbound(filePath),
          outbound: this.retrieveOutbound(filePath)
        }
      } else if (command === 'get-link-database') {
        // NOTE: We need to compact the Map into something JSONable
        return Object.fromEntries(this._fileLinkDatabase)
      }
    })
  }

  public async boot (): Promise<void> {
    // Listen to state changes within the FSAL
    this._fsal.on('fsal-state-changed', (which) => {
      if (which === 'reset-history') { // 'fsal-state-changed', 'reset-history'
        this._fsalHistoryTimestamp = 0
      } else if (which === 'filetree') {
        // Retrieve all new FSAL events and handle them
        const events = this._fsal.filetreeHistorySince(this._fsalHistoryTimestamp)
        for (const event of events) {
          this._fsalHistoryTimestamp = event.timestamp
          this._updateLinksFor(event.path, event.event)
        }
      }
    })
  }

  /**
   * Takes the string of a file and updates any links according to the descriptor
   * retrieved from the FSAL
   *
   * @param   {FSALHistoryEvent}  event  The event to check
   */
  private _updateLinksFor (path: string, event: 'remove'|'add'|'change'): void {
    if (event === 'remove') {
      if (this._fileLinkDatabase.has(path)) {
        this._fileLinkDatabase.delete(path)
      }
      return
    }

    // So here's the thing: We're simply passing down event paths from the FSAL.
    // Normally, this is easy, but sometimes directories are changed. Since we
    // do a lot of comparison and only update if absolutely certain we can add
    // a little bit overhead here
    const dirDescriptor = this._fsal.findDir(path)
    if (dirDescriptor !== undefined && event === 'add') {
      for (const child of dirDescriptor.children) {
        this._updateLinksFor(child.path, event)
      }
      return
    }

    const descriptor = this._fsal.findFile(path)
    if (descriptor === undefined || descriptor.type !== 'file') {
      // File has likely been removed, or some other error
      if (this._fileLinkDatabase.has(path)) {
        this._fileLinkDatabase.delete(path)
      }
      return
    }

    const newLinks = descriptor.links
    const oldLinks = this._fileLinkDatabase.get(path)

    if (oldLinks === undefined) {
      // New file reporting
      this._fileLinkDatabase.set(path, newLinks)
      broadcastIpcMessage('links')
    } else {
      const sameLinks = JSON.stringify(oldLinks) === JSON.stringify(newLinks)

      if (!sameLinks) {
        // Same file reporting different links
        this._fileLinkDatabase.set(path, newLinks)
        broadcastIpcMessage('links')
      }
    }
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
    const descriptor = this._fsal.findFile(sourceFilePath)
    if (descriptor === undefined || descriptor.type === 'code') {
      return []
    }

    const sourceFiles: string[] = []

    const id = descriptor.id
    const linkWithExt = descriptor.name
    const linkWoExt = descriptor.name.replace(descriptor.ext, '')

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
  retrieveOutbound (sourceFilePath: string): string[] {
    const dbLinks = this._fileLinkDatabase.get(sourceFilePath)
    if (dbLinks === undefined) {
      return []
    }

    const outboundLinks: string[] = []

    for (const link of dbLinks) {
      const descriptor = this._fsal.findExact(link)
      if (descriptor !== undefined) {
        outboundLinks.push(descriptor.path)
      }
    }

    return outboundLinks
  }
}
