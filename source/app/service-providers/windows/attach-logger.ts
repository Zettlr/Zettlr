/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        attachLogger function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Adds an event listener that receives log messages
 *                  from the web contents.
 *
 * END HEADER
 */

import type LogProvider from '@providers/log'
import { type BrowserWindow } from 'electron'
import path from 'path'

/**
 * Attaches the global log interface to the webContents in order to save
 * messages from the BrowserWindows into our global log files to make sure we
 * can debug errors in the renderers even if the application has been shut down.
 *
 * @param   {BrowserWindow}  win  The BrowserWindow to attach to
 * @param   {string}         id   A human-readable identifier for the window
 */
export default function attachLogger (logger: LogProvider, win: BrowserWindow, id: string): void {
  // See: https://www.electronjs.org/docs/api/web-contents#event-console-message
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Prepare the generic log message and then log it using the appropriate
    // logger interface.
    const logMessage = `[R] [${id}] ${message} (${path.basename(sourceId)}:${line})`
    switch (level) {
      case 0: // Verbose
        logger.verbose(logMessage)
        break
      case 1: // Info
        logger.info(logMessage)
        break
      case 2: // Warning
        logger.warning(logMessage)
        break
      case 3: // Error
        logger.error(logMessage)
        break
    }
  })
}
