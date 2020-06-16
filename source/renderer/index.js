const $ = require('jquery')
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        main.js
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the renderer process's procedural file. It is
 *                  the main entry point for the application. It simply loads
 *                  the renderer process and initialises everything.
 *
 * END HEADER
 */

const ZettlrRenderer = require('./zettlr-renderer.js')
const ZettlrPrintWindow = require('../print/zettlr-print-window')
const { remote } = require('electron')
require('./assets/styles/app.less')

if (module.hot) {
  module.hot.accept()
}

// We need a global for our renderer element
let renderer

$(document).ready(function () {
  const { windowType } = remote.getCurrentWindow()
  console.log(`Opening window type: ${windowType}`)
  switch (windowType) {
    case 'main':
      $('.print-window').hide()
      // Create the renderer
      renderer = new ZettlrRenderer()
      renderer.init()
      break
    case 'print':
      $('#container').hide()
      // eslint-disable-next-line no-new
      new ZettlrPrintWindow()
      break
  }
})
