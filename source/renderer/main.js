/* global $ */
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

// __dirname is set to the index.htm, not to the renderer directory!
const ZettlrRenderer = require('../zettlr-renderer.js')
// We need a global for our renderer element
var renderer

$(document).ready(function () {
  // Create the renderer
  renderer = new ZettlrRenderer()
  renderer.init()
})
