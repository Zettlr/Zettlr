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

import windowRegister from '../common/modules/window-register'

import ZettlrRenderer from './zettlr-renderer'

declare global {
  interface Window {
    // DEBUG: The tag cloud dialog explicitly needs to reference this. TODO
    renderer: any
  }
}

// First register the window itself (controls, the menu, etc.)
windowRegister()

// We need a global for our renderer element
var renderer = new ZettlrRenderer()
renderer.init()

// TODO: Remove asap
window.renderer = renderer
