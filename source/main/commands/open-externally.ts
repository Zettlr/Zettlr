/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        OpenExternally command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command opens a link (either local or external) outside the Zettlr main Browser window.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { shell } from 'electron'
import isDir from '../../common/util/is-dir'
import isFile from '../../common/util/is-file'

export default class OpenExternally extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'open-external')
  }

  /**
    * Open a link externally.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing the href of the link to open
    */
  async run (evt: string, arg: any): Promise<void> {
    if (isDir(arg.href) || isFile(arg.href)) {
      try {
        let potentialError = await shell.openPath(arg.href)
        if (potentialError !== '') {
          global.log.error('Could not open attachment:' + potentialError)
          global.notify.normal(`Could not open ${arg.href as string} externally.`)
        }
      } catch (e) {
        // openPath does not throw according to the logs.
      }
      return
    }

    // Next possibility: Weblink
    try {
      await shell.openExternal(arg.href)
    } catch (e) {
      global.log.error(`Could not open ${arg.href as string} externally: ${e.message as string}`, e)
      global.notify.normal(`Could not open ${arg.href as string} externally.`) // TODO: Translate
    }
  }
}
