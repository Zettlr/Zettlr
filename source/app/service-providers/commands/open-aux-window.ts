/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        OpenAuxWindow command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command can be used to open an auxiliary window (e.g.,
 *                  the assets manager) programmatically.
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export enum ProgrammaticallyOpenableWindows {
  AssetsWindow = 'assets-window'
}

export default class OpenAuxWindow extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'open-aux-window')
  }

  /**
   * Search a file and return the results to the renderer.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of a file to be searched
   * @return {Boolean}     Whether the call succeeded.
   */
  async run (evt: string, arg: { window: ProgrammaticallyOpenableWindows, hash?: string }): Promise<boolean> {
    switch (arg.window) {
      case ProgrammaticallyOpenableWindows.AssetsWindow:
        this._app.windows.showDefaultsWindow(arg.hash)
        return true
      default:
        this._app.log.error(`Cannot programmatically open window ${arg.window as string}: Not available for opening`)
        return false
    }
  }
}
