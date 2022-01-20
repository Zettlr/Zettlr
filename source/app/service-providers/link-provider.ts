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
import path from 'path'

const fileLinkDatabase: Map<string, string[]> = new Map()
const idLinkDatabase: Map<string, string[]> = new Map()

export async function boot (): Promise<void> {
  global.log.verbose('Link provider booting up ...')
  ipcMain.handle('link-provider', (event, message) => {
    const { command } = message

    if (command === 'get-inbound-links') {
      const sourceFiles: string[] = []
      // Return whatever links to the given file
      const { filePath, fileID } = message.payload
      const basenameExt = path.basename(filePath)
      const basenameNoExt = path.basename(filePath, path.extname(filePath))

      // Search all recorded links
      for (const [ file, outbound ] of fileLinkDatabase.entries()) {
        if (outbound.includes(basenameExt) || outbound.includes(basenameNoExt)) {
          sourceFiles.push(file)
        } else if (fileID !== undefined && outbound.includes(fileID)) {
          sourceFiles.push(file)
        }
      }

      // NOTE: The resolution of these files will take place from within the
      // renderer on-demand
      return sourceFiles
    }
  })
}

/**
 * Shuts down the service provider
 * @return {Boolean} Returns true after successful shutdown
 */
export async function shutdown (): Promise<boolean> {
  global.log.verbose('Link provider shutting down ...')
  return true
}

/**
* Adds an array of links from a specific file to the database. This
* function assumes sourceIDs to be unique, so in case of a duplicate, the
* later-loaded file overrides the earlier loaded one.
*
* @param   {string}            sourcePath     The full path to the source file
* @param   {string[]}          outboundLinks  A collection of links
* @param   {string|undefined}  sourceID       The ID of the source (if applicable)
*/
export function reportLinks (sourcePath: string, outboundLinks: string[], sourceID?: string): void {
  // NOTE: The FSAL by now defaults to an empty string instead of undefined
  if (sourceID === '') {
    sourceID = undefined
  }

  fileLinkDatabase.set(sourcePath, outboundLinks)
  if (sourceID !== undefined) {
    idLinkDatabase.set(sourceID, outboundLinks)
  }
  broadcastIpcMessage('links')
}

/**
 * Removes any outbound links emanating from the given file from the
 * database. This function assumes sourceIDs to be unique, so in case of
 * a duplicate, removing any of these files will delete the links for all.
 *
 * @param   {string}            sourcePath     The full path to the source file
 * @param   {string|undefined}  sourceID       The ID of the source (if applicable)
 */
export function removeLinks (sourcePath: string, sourceID?: string): void {
  // NOTE: The FSAL by now defaults to an empty string instead of undefined
  if (sourceID === '') {
    sourceID = undefined
  }

  if (fileLinkDatabase.has(sourcePath)) {
    fileLinkDatabase.delete(sourcePath)
  }

  if (sourceID !== undefined && idLinkDatabase.has(sourceID)) {
    idLinkDatabase.delete(sourceID)
  }
  broadcastIpcMessage('links')
}
