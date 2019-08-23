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
const { trans } = require('../../common/lang/i18n')
const formatDate = require('../../common/util/format-date')

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

  postAct () {
    // Retrieve additional data from main
    global.ipc.send('get-translation-metadata', {}, (data) => {
      // List all contributors to translations
      let html = ''
      for (let lang of data) {
        let failsafe = 'dialog.preferences.app_lang.' + lang.bcp47
        let name = trans(failsafe)
        if (name === failsafe) name = lang.bcp47
        html += `<h3>${name} <small>last updated ${formatDate(new Date(lang.updated_at))}</small></h3>`
        html += '<ul>'
        for (let author of lang.authors) html += `<li>${author.replace(/<(.+)>/g, '<small>(<a href="mailto:$1">$1</a>)</small>')}</li>`
        html += '</ul>'
      }
      document.getElementById('contrib').innerHTML = html
    })
  }
}

module.exports = AboutDialog
