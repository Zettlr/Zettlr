/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Print command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command shows the print window.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class Print extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'print')
  }

  /**
   * Prints the current file (in: opening the print window)
   * @param {String} evt The event name
   * @param {Object} arg The argument
   * @return {Boolean} Whether the command ran successful
   */
  async run (evt: string, arg?: string): Promise<void> {
    const filePath = arg

    if (filePath == null) {
      this._app.log.error('[Print] Cannot print document: Not found.')
      return
    }

    const fileDescriptor = this._app.workspaces.findFile(filePath)

    if (fileDescriptor === undefined) {
      this._app.log.error('[Print] Cannot print document: Not found.')
      return
    }

    this._app.windows.showPrintWindow(fileDescriptor.path)
  }
}
