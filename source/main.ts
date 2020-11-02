/**
 * @ignore
 * BEGIN HEADER
 *
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the application's entry file. This gets executed as
 *                  soon as the app starts. Its task is only to hook onto the
 *                  app events and boot the application.
 *
 * END HEADER
 */

import { app } from 'electron'
import { bootApplication, shutdownApplication } from './app/lifecycle'

// Include the global Zettlr class
import Zettlr from './main/zettlr'

// Helper function to extract files to open from process.argv
import extractFilesFromArgv from './common/util/extract-files-from-argv'

// Immediately after launch, check if there is already another instance of
// Zettlr running, and, if so, exit immediately. The arguments (including files)
// from this instance will already be passed to the first instance.
if (!app.requestSingleInstanceLock()) {
  app.exit(0)
}

// If we reach this point, we are now booting the first instance of Zettlr.

// *****************************************************************************

// Set up the pre-boot log
global.preBootLog = []

// NOTE: This has to be set even before the application has been booted.
global.filesToOpen = []

/**
 * This will be overwritten by the log provider, once it has booted
 */
global.log = {
  verbose: (message: string) => {
    global.preBootLog.push({ 'level': 1, 'message': message })
  },
  info: (message: string) => {
    global.preBootLog.push({ 'level': 2, 'message': message })
  },
  warning: (message: string) => {
    global.preBootLog.push({ 'level': 3, 'message': message })
  },
  error: (message: string) => {
    global.preBootLog.push({ 'level': 4, 'message': message })
  },
  showLogViewer: () => { /* Dummy method to fulfill interface contract */ }
}

/**
 * The main Zettlr object. As long as this exists in memory, the app will run.
 * @type {Zettlr|null}
 */
let zettlr: Zettlr|null = null

/**
 * Hook into the ready event and initialize the main object creating everything
 * else. It is necessary to wait for the ready event, because prior, some APIs
 * may not work correctly.
 */
app.whenReady().then(() => {
  // Immediately boot the application. This function performs some initial
  // checks to make sure the environment is as expected for Zettlr, and boots
  // up the providers.
  bootApplication().then(() => {
    // Now instantiate the main class which will care about everything else
    zettlr = new Zettlr()
  }).catch(err => console.error(err))
}).catch(e => console.error(e))

/**
 * This event will be called if another instance of Zettlr has been opened with
 * the argv of that instance.
 * NOTE from the electron docs: This event is guaranteed to be emitted after
 * the ready event of app gets emitted.
 * @param {Object} event The instance event
 * @param {Array} argv The arguments the second instance had received
 * @param {String} cwd The current working directory
 */
app.on('second-instance', (event, argv, cwd) => {
  if (zettlr === null) {
    console.error('A second instance called this instance but a Zettlr object has not yet been instantiated. This may indicate a logical error.')
    return
  }

  let files = extractFilesFromArgv(argv) // Override process.argv with the correct one

  if (files.length === 0) return // Nothing to do

  global.log.info(`Opening ${files.length} files from a second instance.`, files)

  // openWindow calls the appropriate function of the windowManager, which deals
  // with the nitty-gritty of actually making the main window visible.
  zettlr.openWindow()

  // In case the user wants to open a file/folder with this running instance
  zettlr.handleAddRoots(files).catch(err => { console.error(err) })
})

/**
 * This gets executed when the user wants to open a file on macOS.
 */
app.on('open-file', (e, p) => {
  e.preventDefault() // Need to explicitly set this b/c we're handling this
  // The user wants to open a file -> simply handle it.
  if (zettlr !== null) {
    zettlr.handleAddRoots([p]).catch((err) => {
      global.log.error('[Application] Error while adding new roots', err)
    })
  } else {
    // The Zettlr object has yet to be created -> use the global.
    global.filesToOpen.push(p)
  }
})

/**
 * Quit as soon as all windows are closed and we are not on macOS.
 */
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin' && zettlr !== null) {
    // Shutdown the app before quitting
    Promise.all([
      shutdownApplication(),
      zettlr.shutdown()
    ])
      .catch(err => console.error(err))
      .finally(() => app.quit())
  }
})

/**
 * Hook into the will-quit event to make sure we are able to shut down our app
 * properly.
 */
app.on('will-quit', function (event) {
  if (zettlr !== null) {
    Promise.all([
      shutdownApplication(),
      zettlr.shutdown()
    ])
      .catch(err => console.error(err))
  }
})

/**
 * On macOS, open a new window as soon as the user re-activates the app.
 */
app.on('activate', function () {
  if (zettlr !== null) {
    zettlr.openWindow()
  }
})

/**
 * Hook into the unhandledRejection-event to prevent nasty error messages when
 * a Promise is rejected somewhere.
 */
process.on('unhandledRejection', (err: any) => {
  // Just log to console.
  global.log.error('[Application] Unhandled rejection received', err)
})
