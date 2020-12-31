/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Log Viewer window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the log viewer's procedural file. It is
 *                  the main entry point for the application. It simply loads
 *                  the renderer process and initialises everything.
 *
 * END HEADER
 */

import windowRegister from '../common/modules/window-register'
import Vue from 'vue'
import LogViewer from './log-viewer.vue'

windowRegister({
  // The log viewer does not have a menubar
  showMenubar: false
})

// Destructure the App config object, and enrich with store and hook
const app = new Vue(LogViewer)

app.$mount('#app')
