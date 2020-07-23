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

// Include the geometry style of the app (will be included in the html by webpack magic)
import './../common/assets/less/main.less'

import ZettlrRenderer from './zettlr-renderer'
// We need a global for our renderer element
var renderer = new ZettlrRenderer()
renderer.init()
