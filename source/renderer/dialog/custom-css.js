/* global $ */
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
const CodeMirror = require('codemirror')
const { ipcRenderer } = require('electron')

class CustomCSS extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'custom-css'
    this._cm = null
  }

  preInit (data) {
    data = {
      'styles': data
    }
    return data
  }

  postAct () {
    this._cm = CodeMirror.fromTextArea(document.getElementById('custom-css'), {
      lineNumbers: true,
      mode: 'css',
      theme: 'custom-css',
      cursorScrollMargin: 20,
      lineWrapping: true,
      autoCloseBrackets: true
    })

    // Add a CSS mode option so that it becomes a "real" code editor
    $('.dialog .CodeMirror').addClass('cm-css-mode')

    // We need to refresh it afterwards to apply changed font sizes etc.
    this._cm.refresh()

    // Activate the sender
    $('div.dialog #save').click((e) => {
      ipcRenderer.send('css-provider', {
        command: 'set-custom-css',
        payload: this._cm.getValue()
      })

      this.close()
    })
  }
}

module.exports = CustomCSS
