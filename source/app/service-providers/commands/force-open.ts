/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ForceOpen command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command forces open a file, or creates it, if desired,
 *                  and opens it afterwards.
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'
import getNewLinkedFileDirectory from '@common/util/get-new-linked-file-directory'

export interface ForceOpenAPI {
  windowId?: string
  leafId?: string
  linkContents: string
  newTab?: boolean
}

/**
 * The outcome of a force-open: An existing file was opened, a new file was
 * created, or neither happened (e.g., because the user does not want files to
 * be created automatically). For opened and created files, filePath contains
 * the file's path.
 */
export type ForceOpenResult = { action: 'opened'|'created', filePath: string }|{ action: 'none' }

export default class ForceOpen extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, ['force-open'])
  }

  /**
    * Force-Opens a file, after click on internal link
    *
    * @param   {string}        evt      The event name
    * @param   {ForceOpenAPI}  payload  the parameters of the file to be opened
    * @return  {ForceOpenResult}        Whether a file was opened, created, or neither.
    */
  async run (evt: string, payload: ForceOpenAPI): Promise<ForceOpenResult> {
    let { windowId, linkContents, newTab, leafId } = payload

    if (windowId === undefined) {
      windowId = this._app.documents.windowKeys()[0]
    }

    const filename = linkContents.includes('#') ? linkContents.slice(0, linkContents.indexOf('#')) : linkContents

    const file = await this._app.fsal.findExact(filename)

    // Now we have a file (if not, create a new one if the user wishes so)
    if (file !== undefined) {
      await this._app.documents.openFile(windowId, leafId, file.path, newTab)
      return { action: 'opened', filePath: file.path }
    } else {
      // Determine if and where the file should be created, according to the
      // user's preferences.
      const config = this._app.config.get()
      const { newFileLocation, customDirectory } = config.zkn

      // The file containing the link is the active file of the leaf from which
      // the link was followed (or the last focused leaf, if unknown).
      const sourceLeafId = leafId ?? this._app.documents.getLastFocusedLeafId()
      const sourceFile = sourceLeafId !== undefined
        ? this._app.documents.getActiveFile(sourceLeafId)
        : null

      const targetDir = getNewLinkedFileDirectory(newFileLocation, customDirectory, sourceFile, config.app.openWorkspaces)

      if (targetDir !== undefined && await this._app.fsal.isDir(targetDir)) {
        // Call the file-new command on the application, which'll do all
        // necessary steps for us.
        const createdPath = await this._app.commands.run('file-new', { windowId, leafId, name: linkContents, path: targetDir })
        if (typeof createdPath === 'string') {
          return { action: 'created', filePath: createdPath }
        }
      }

      return { action: 'none' }
    }
  }
}

module.exports = ForceOpen
