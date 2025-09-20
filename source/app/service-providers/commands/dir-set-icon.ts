/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirSetIcon command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Sets the icon of a directory in its settings.
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export default class DirSetIcon extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-set-icon')
  }

  /**
    * Sets the icon for a directory
    * @param {String} evt The event name
    * @param  {Object} arg An object containing both a hash and an icon
    */
  async run (evt: string, arg: any): Promise<boolean> {
    let dir = this._app.workspaces.findDir(arg.path)

    if (dir === undefined) {
      return false
    }

    await this._app.fsal.setDirectorySetting(dir, { icon: arg.icon })
    return true
  }
}
