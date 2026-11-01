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

export interface SplashScreenInfo {
  currentStepMessage: string
  currentStepPercentage: number
}

// This variable contains the information that should be shown on the splash
// screen. We use a separate variable for this so that update events can be
// cached while the boot sequence is running, but before the splash screen
// actually shows on screen.
let splashScreenInfo: SplashScreenInfo = {
  currentStepMessage: '',
  currentStepPercentage: 0
}

let debounceTimeout: NodeJS.Timeout|undefined

/**
 * Shows a splash screen for Zettlr. NOTE: Remember to call `closeSplashScreen`
 * once your startup procedure is done! Otherwise the splash screen becomes
 * unclosable.
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
      // We only log the error if splashScreen is not undefined. This is due to
      // a small race condition, where the timer would fire to open the splash
      // screen shortly before the boot sequence is finished, and the close
      // method will be called after `loadURL` has been called, but before the
      // window actually shows. Destroying a window during its boot process will
      // throw an error, which we swallow in this way.
      if (splashScreen !== undefined) {
        const message = e instanceof Error ? e.message : 'Unknown error'
        logger.error(`Could not load URL ${SPLASH_SCREEN_WEBPACK_ENTRY}: ${message}`, e)
      }
    })

  splashScreen.once('ready-to-show', () => {
    splashScreen?.show()
    const { currentStepMessage, currentStepPercentage } = splashScreenInfo
    updateSplashScreen(currentStepMessage, currentStepPercentage)
  })

  splashScreen.once('closed', () => {
    splashScreen = undefined
  })
}

/**
 * Updates the splash screen's info panel with a step message and a step
 * percentage. This function can also be called independently of whether the
 * splash screen is already shown. This way, messages won't be sent to the
 * window but instead cached, and once the splash screen is open, it will be
 * updated to reflect the last update call.
 *
 * @param   {string}  currentStepMessage     The current step message.
 * @param   {number}  currentStepPercentage  The step percentage (0-100).
 */
export function updateSplashScreen (currentStepMessage: string, currentStepPercentage: number): void {
  splashScreenInfo = { currentStepMessage, currentStepPercentage }

  if (debounceTimeout !== undefined) {
    return
  }

  splashScreen?.webContents.send('step-update', { currentStepMessage, currentStepPercentage })

  debounceTimeout = setTimeout(() => {
    debounceTimeout = undefined
  }, 1000/60) // Debounce timeout: 60 fps
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
