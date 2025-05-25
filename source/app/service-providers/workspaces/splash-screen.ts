/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SplashScreen
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the code to display a splash screen.
 *                  Since the FSAL is the only provider that may actually take
 *                  quite some time to finish booting (and thus prolong the time
 *                  it takes to show the main window), we have collocated it
 *                  here, since only the FSAL should after some delay show a
 *                  splash screen to indicate that there is something happening
 *                  even if no window is shown yet.
 *
 * END HEADER
 */

import type LogProvider from '@providers/log'
import { BrowserWindow } from 'electron'

let splashScreen: BrowserWindow|undefined

// These two properties always hold the last message/percent that has been
// provided via updateSplashScreen. This is necessary if progress already
// happens before the splash screen has actually opened.
let initSplashScreenMessage = ''
let initSplashScreenPercent = 0

/**
 * Shows a splash screen for Zettlr. NOTE: Remember to call `closeSplashScreen`
 * once your startup procedure is done!
 *
 * @param   {LogProvider}  logger  The logger for potential error messages.
 */
export function showSplashScreen (logger: LogProvider): void {
  if (splashScreen !== undefined) {
    splashScreen.show()
    return
  }

  splashScreen = new BrowserWindow({
    width: 600,
    height: 400,
    center: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    closable: false,
    alwaysOnTop: true,
    fullscreenable: false,
    skipTaskbar: true,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      // contextIsolation and sandbox mean: Preload scripts have access to
      // Node modules, the renderers not
      contextIsolation: true,
      sandbox: false,
      preload: SPLASH_SCREEN_PRELOAD_WEBPACK_ENTRY
    }
  })

  splashScreen.loadURL(SPLASH_SCREEN_WEBPACK_ENTRY)
    .catch(e => {
      logger.error(`Could not load URL ${SPLASH_SCREEN_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  splashScreen.once('ready-to-show', () => {
    splashScreen?.show()
    updateSplashScreen(initSplashScreenMessage, initSplashScreenPercent)
  })

  splashScreen.once('closed', () => {
    splashScreen = undefined
  })
}

/**
 * Updates the splash screen's info panel with a step message and a step
 * percentage.
 *
 * @param   {string}  currentStepMessage     The current step message.
 * @param   {number}  currentStepPercentage  The step percentage (0-100).
 */
export function updateSplashScreen (currentStepMessage: string, currentStepPercentage: number): void {
  initSplashScreenMessage = currentStepMessage
  initSplashScreenPercent = currentStepPercentage
  splashScreen?.webContents.send('step-update', { currentStepMessage, currentStepPercentage })
}

/**
 * Closes the splash screen. Do not forget to call this function once you're
 * done.
 */
export function closeSplashScreen (): void {
  // NOTE: We must "destroy" the window, because otherwise 'closable: false'
  // will prevent programmatic closing.
  splashScreen?.destroy()
  splashScreen = undefined
}
