/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AboutDialog class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This dialog shows the about window, displaying all packages
 *                  used by Gettlr, the license and additional info.
 *
 * END HEADER
 */

const GettlrDialog = require('./gettlr-dialog.js')

class ErrorDialog extends GettlrDialog {
  constructor () {
    super()
    this._dialog = 'error'
  }
}

module.exports = ErrorDialog
