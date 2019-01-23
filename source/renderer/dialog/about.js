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
 *                  used by Zettlr, the license and additional info.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')

class AboutDialog extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'about'
  }

  preInit (data) {
    data.version = require('../../package.json').version
    data.uuid = global.config.get('uuid')
    return data
  }
}

module.exports = AboutDialog
