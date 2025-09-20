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

export interface ForceOpenAPI {
  windowId?: string
  leafId?: string
  linkContents: string
  newTab?: boolean
}

export default class ForceOpen extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, ['force-open'])
  }

  /**
    * Force-Opens a file, after click on internal link
    *
    * @param   {string}        evt      The event name
    * @param   {ForceOpenAPI}  payload  the parameters of the file to be opened
    * @return  {boolean}                Whether the file was successfully opened.
    */
  async run (evt: string, payload: ForceOpenAPI): Promise<void> {
    let { windowId, linkContents, newTab, leafId } = payload

    if (windowId === undefined) {
      windowId = this._app.documents.windowKeys()[0]
    }

    // Determine if the file should be created, if it can't be found. For this
    // we need both the respective preferences setting and an auto-search
    // command.
    const { customDirectory } = this._app.config.get().zkn

    const filename = linkContents.includes('#') ? linkContents.slice(0, linkContents.indexOf('#')) : linkContents

    const file = this._app.workspaces.findExact(filename)

    // Now we have a file (if not, create a new one if the user wishes so)
    if (file !== undefined) {
      await this._app.documents.openFile(windowId, leafId, file.path, newTab)
    } else if (await this._app.fsal.isDir(customDirectory)) {
      // Call the file-new command on the application, which'll do all
      // necessary steps for us.
      await this._app.commands.run('file-new', { windowId, leafId, name: linkContents, path: customDirectory })
    }
  }
}

module.exports = ForceOpen
