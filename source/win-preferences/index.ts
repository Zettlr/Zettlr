/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Preferences window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the entry for the application-wide preferences
 *                  dialog. The decision to move preferences (and other modals)
 *                  to their own windows in early 2021 was motivated by a few
 *                  key points:
 *
 *                  - Maintainability: Especially the preferences dialog has
 *                    become much too cluttered, and proven difficult to
 *                    maintain using the handlebars-JS-couple. This way we can
 *                    put the main renderer on a diet and implement more
 *                    functionality in the distinct modals.
 *                  - UX considerations: Even though it was pretty neat having
 *                    central dialogs pop up over the main renderer window, this
 *                    is inconsistent with common UX guidelines. Even though
 *                    more and more applications customize their appearance, the
 *                    preferences window is something where most Electron apps
 *                    still follow the lazy way of displaying them inside the
 *                    main window. In order to make Zettlr much more consistent
 *                    with native applications (and maybe to silence some
 *                    critics?) we have opted to displaying these windows in
 *                    their own browser window instance. Yes, this might be
 *                    overshooting the goal a little bit, but we don't open
 *                    those dialogs either way.
 *                  - UI considerations: Lastly, having dedicated dialog windows
 *                    enables us to style these windows exactly like the
 *                    platforms's native dialog windows, increasing the
 *                    immersion into the corresponding operating system even
 *                    more.
 *
 * END HEADER
 */

import Vue from 'vue'
import Preferences from './preferences.vue'
import windowRegister from '../common/modules/window-register'

const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

// The first thing we have to do is run the window controller
windowRegister()

// This window will be closed immediately on a window-close command
// TODO: Move this to the window register function?
ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'close-window') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
})

ipcRenderer.on('config-provider', (event, message) => {
  const { command } = message
  if (command === 'update') {
    const { payload } = message
    if (payload === 'editor.fontSize') {
      app.$data.fontSize = global.config.get('editor.fontSize')
    }
  }
})

// Create the Vue app because we need to reference it in our toolbar controls
const app = new Vue(Preferences)

// In the end: mount the app onto the DOM
app.$mount('#app')
