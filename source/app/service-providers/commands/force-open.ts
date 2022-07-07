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

import ZettlrCommand from './zettlr-command'
import isDir from '@common/util/is-dir'

export default class ForceOpen extends ZettlrCommand {
  constructor (app: any) {
    super(app, ['force-open'])
  }

  /**
    * Force-Opens a file, after click on internal link
    * @param {String} evt The event name
    * @param  {Object} payload the parameters of the file to be opened
    * @return {Boolean} Whether the file was successfully opened.
    */
  async run (evt: string, payload: any): Promise<void> {
    let { windowId, linkContents, newTab, leafId } = payload

    if (windowId === undefined) {
      windowId = this._app.documents.windowKeys()[0]
    }

    // Determine if the file should be created, if it can't be found. For this
    // we need both the respective preferences setting and an auto-search
    // command.
    const autoCreate: boolean = this._app.config.get('zkn.autoCreateLinkedFiles')
    const customDir: string = this._app.config.get('zkn.customDirectory')

    const file = this._app.fsal.findExact(linkContents)

    // Now we have a file (if not, create a new one if the user wishes so)
    if (file !== undefined) {
      await this._app.documents.openFile(windowId, leafId, file.path, newTab)
    } else if (autoCreate && isDir(customDir)) {
      // Call the file-new command on the application, which'll do all
      // necessary steps for us.
      await this._app.commands.run('file-new', { windowId, leafId, name: linkContents, path: customDir })
    } else if (autoCreate && !isDir(customDir)) {
      await this._app.commands.run('file-new', { windowId, leafId, name: linkContents })
    }
  }
}

module.exports = ForceOpen
