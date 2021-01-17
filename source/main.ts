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
  }
}

/**
 * The main Zettlr object. As long as this exists in memory, the app will run.
 * @type {Zettlr|null}
 */
let zettlr: Zettlr|null = null

/**
 * This variable is being used to determine if all servive providers have
 * successfully shut down and we can actually quit the app.
 *
 * @var {boolean}
 */
let canQuit: boolean = false

/**
 * Hook into the ready event and initialize the main object creating everything
 * else. It is necessary to wait for the ready event, because prior, some APIs
 * may not work correctly.
 */
app.whenReady().then(() => {
  // Override the about panel options so that a little bit more is being shown.
  // Makes only sense for macOS, as we don't call the showAboutPanel() method
  // programmatically, but either way, it's a little bit nicer.
  app.setAboutPanelOptions({
    applicationName: 'Zettlr',
    applicationVersion: app.getVersion(),
    copyright: `Copyright (c) 2017 - ${(new Date()).getFullYear()} by Hendrik Erz. Licensed via GNU GPL 3.0`,
    // version: If we ever introduce a build number. This defaults to the Electron version.
    credits: 'We would like to thank all contributors to the app, its translators, and those who meticulously update the documentation.',
    authors: ['Hendrik Erz'], // TODO: Somehow generate the contributors list.
    website: 'https://www.zettlr.com/',
    iconPath: process.execPath
  })
  // Immediately boot the application. This function performs some initial
  // checks to make sure the environment is as expected for Zettlr, and boots
  // up the providers.
  bootApplication().then(() => {
    // Now instantiate the main class which will care about everything else
    zettlr = new Zettlr()
    zettlr.init().catch(err => {
      console.error(err)
      app.exit(1)
    })
  }).catch(err => {
    console.error(err)
    app.exit(1)
  })
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
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

/**
 * Hook into the will-quit event to make sure we are able to shut down our app
 * properly.
 */
app.on('will-quit', function (event) {
  if (!canQuit) {
    // Prevent immediate shutdown and allow the process to shut down first
    event.preventDefault()
  } else {
    return // Don't prevent quitting, but we don't need to shut down again.
  }

  const promises = [shutdownApplication()]
  if (zettlr !== null) {
    promises.push(zettlr.shutdown())
  }
  Promise.all(promises)
    .then(() => {
      // Now we can safely quit the app. Set the flag so that the callback
      // won't stop the shutdown, and programmatically quit the app.
      canQuit = true
      app.quit()
    })
    .catch(err => console.error(err))
})

/**
 * On macOS, open a new window as soon as the user re-activates the app.
 */
app.on('activate', function () {
  if (zettlr !== null) {
    zettlr.openAnyWindow()
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
