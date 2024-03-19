/**
 * @ignore
 * BEGIN HEADER    TODO: MOVE TO LIFECYCLE!
 *
 * Contains:        attachAppNavigationHandlers function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Listens to navigation events on all webContents across the
 *                  application. Must be called exactly once per app run.
 *
 * END HEADER
 */

import { app, shell } from 'electron'
import type LogProvider from '../service-providers/log'

/**
 * Takes an URL and decides if we should open it externally (web browser,
 * default application, etc.), and does so.
 *
 * @param   {string}  url  The URL to check.
 */
function maybeOpenExternal (url: string): void {
  if (url.startsWith('safe-file://')) {
    // will-navigate assumes an URL and will pass an encoded URI, so we have to
    // make sure to decode the url so that %28 becomes ( again.
    const unencoded = decodeURIComponent(url).substring(12)
    // On Windows, it likes to add a third slash at the beginning (because
    // unlike UNIX, absolute paths start with a letter, not a slash)
    const leadingSlash = unencoded.startsWith('/') && process.platform === 'win32'
    const realPath = leadingSlash ? unencoded.substring(1) : unencoded
    // We need to remove the protocol to ensure shell.openPath works.
    shell.openPath(realPath).catch(err => {
      console.error(`[Window Manager] Could not open path ${realPath}: ${err.message}.`)
    })
  } else {
    shell.openExternal(url).catch(err => {
      console.error(`[Window Manager] Could not open URL ${url}: ${err.message}.`)
    })
  }
}

/**
 * Hooks up an event listener that responds to any new web content being
 * created. Whenever a new webContents is being created, it attaches two event
 * listeners to it that will prevent two things:
 *
 * 1. Prevent navigation away from the window's loaded URL
 * 2. Prevent opening of arbitrary windows with external URLs
 *
 * Instead, the handler will defer opening the passed URL to a helper function
 * that opens that URL in the system's actual web browser, or shows the file in
 * the file browser, if applicable.
 */
export function attachAppNavigationHandlers (log: LogProvider): void {
  app.on('web-contents-created', (event, webContents) => {
    webContents.setWindowOpenHandler(({ url }) => {
      log.info(`[Navigation Handler] New webContents created with URL ${url}`)
      // NOTE: This is only called when a *renderer* wants to open a new window.
      // We always disallow this since we only create our windows from the main
      // process. However, we may want to open whatever this is externally.
      maybeOpenExternal(url)
      return { action: 'deny' }
    })

    webContents.on('will-navigate', (event, url) => {
      log.info(`[Navigation Handler] webContents wants to navigate to ${url}`)
      // NOTE: app.isPackaged is false if the executable is called electron
      // (instead of Zettlr)
      if (!app.isPackaged && url.startsWith('http://localhost:3000')) {
        // We are in development, so we must make sure to allow webpack to
        // actually reload the windows. Webpack will always spin up devServers
        // at localhost.
        return true
      }

      // Prevent any navigation from within the window. Instead, transform this
      // into a shell command to open in an actual browser, not within our own
      // browser windows.
      event.preventDefault()
      maybeOpenExternal(url)
    })
  })
}
