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
      global.ipc.send('set-custom-css', this._cm.getValue(), (ret) => {
        // TODO error handling
        if (ret) {
          let customCSS = $('#custom-css-link')
          if (customCSS.length === 0) {
            // We have to create the element
            global.ipc.send('get-custom-css-path', {}, (ret) => {
              let lnk = $('<link>').attr('rel', 'stylesheet')
              lnk.attr('href', 'file://' + ret + '?' + Date.now())
              lnk.attr('type', 'text/css')
              lnk.attr('id', 'custom-css-link')
              $('head').first().append(lnk)
            })
          } else {
            // The element is already there. We need to simply re-use the CSS
            // using a cachebreaker
            customCSS = customCSS.first()
            let file = customCSS.attr('href').split('?')[0]
            customCSS.attr('href', file + '?' + Date.now())
          }
          this.close()
        }
      })
    })
  }
}

module.exports = CustomCSS
