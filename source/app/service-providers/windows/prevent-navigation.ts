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

import LogProvider from '@providers/log'
import { app, BrowserWindow, shell } from 'electron'

/**
 * Attaches an event listener to win's webContents that prevents any navigation
 * away from the original URL, which in the case of Zettlr are all webpack entry
 * points. We never want to load any other URL in our windows, so this event
 * listener MUST be attached to every single window created by the main process
 * in order to prevent accidental navigation.
 *
 * @param   {BrowserWindow}  win  The BrowserWindow in question
 */
export default function preventNavigation (logger: LogProvider, win: BrowserWindow): void {
  win.webContents.on('will-navigate', (event, url) => {
    // NOTE: app.isPackaged is false if the executable is called electron (instead of Zettlr)
    if (!app.isPackaged) {
      // We are in development, so we must make sure to allow webpack to
      // actually reload the windows. Webpack will always spin up devServers
      // at localhost.
      if (url.startsWith('http://localhost:3000')) {
        return true
      }
    }

    // Prevent any navigation from within the window. Instead,
    // transform this into a shell command to open in an actual
    // browser, not within our own browser windows.
    event.preventDefault()

    if (url.startsWith('safe-file://')) {
      // will-navigate assumes an URL and will pass an encoded URI, but if it
      // is a safe-file, it's not an actual URL, but rather a path.
      // So we have to make sure to decode the url, i.e.,  %28 becomes ( again.
      const unencoded = decodeURIComponent(url)
      // We need to remove the protocol to ensure shell.openPath works.
      logger.verbose(`[Window Manager] Opening path ${unencoded.substring(12)}.`)
      shell.openPath(unencoded.substring(12))
        .catch(error => logger.error(
          `[Window Manager] Could not open path ${unencoded.substring(12)}.`,
          error
        ))
    } else {
      logger.verbose(
        `[Window Manager] Opening ${url} in default browser.`)
      shell.openExternal(url)
        .catch(error => logger.error(
          `[Window Manager] Could not open URL ${url}.`,
          error
        ))
    }
  })
}
