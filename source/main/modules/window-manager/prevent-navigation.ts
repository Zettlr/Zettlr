/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        preventNavigation function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Attaches an event listener that prevents navigation.
 *
 * END HEADER
 */

import {
  BrowserWindow,
  shell
} from 'electron'

/**
 * Attaches an event listener to win's webContents that prevents any navigation
 * away from the original URL, which in the case of Zettlr are all webpack entry
 * points. We never want to load any other URL in our windows, so this event
 * listener MUST be attached to every single window created by the main process
 * in order to prevent accidental navigation.
 *
 * @param   {BrowserWindow}  win  The BrowserWindow in question
 */
export default function preventNavigation (win: BrowserWindow): void {
  win.webContents.on('will-navigate', (event, url) => {
    // Prevent any navigation from within the window. Instead,
    // transform this into a shell command to open in an actual
    // browser, not within our own browser windows.
    event.preventDefault()

    if (url.startsWith('safe-file://')) {
      // We have a local file, so we need to remove the protocol, which will
      // ensure shell.openExternal will work.
      global.log.verbose(`[Window Manager] Opening path ${url.substr(12)}.`)
      shell.openPath(url.substr(12))
        .catch(error => global.log.error(
          `[Window Manager] Could not open path ${url.substr(12)}.`,
          error
        ))
    } else {
      global.log.verbose(
        `[Window Manager] Opening ${url} in default browser.`)
      shell.openExternal(url)
        .catch(error => global.log.error(
          `[Window Manager] Could not open URL ${url}.`,
          error
        ))
    }
  })
}
