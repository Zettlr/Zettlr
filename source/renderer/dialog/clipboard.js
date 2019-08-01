/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CustomCSS class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This dialog lets users edit their custom CSS directives.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')
const { clipboard } = require('electron')

class DevClipboard extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'dev-clipboard'
  }

  preInit (data) {
    let img = clipboard.readImage()
    let size = img.getSize() || { 'width': 0, 'height': 0 }
    data = {
      'clipboardHTML': clipboard.readHTML() || 'The Clipboard does not contain HTML.',
      'clipboardText': clipboard.readText() || 'The Clipboard does not contain plain Text.',
      'clipboardRTF': clipboard.readRTF() || 'The Clipboard does not contain RichText.',
      'clipboardImage': (img.isEmpty()) ? '' : img.toDataURL(),
      'imgWidth': size.width,
      'imgHeight': size.height
    }
    return data
  }

  postAct () {
  }
}

module.exports = DevClipboard
