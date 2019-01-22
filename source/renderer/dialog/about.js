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
