/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        main.js
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the only procedural file in the app. It is the
 *                  main entry point for the application. What it does: Listen
 *                  to app-Events and initialize the Zettlr object.
 *
 * END HEADER
 */

// First require the complete electron environment and put it into var
const electron = require('electron')

// Module to control application life.
const app = electron.app
const process = require('process')

// Include the global Zettlr class
const Zettlr = require('./main/zettlr.js')

const { isFile, ignoreFile } = require('./common/zettlr-helpers.js')

/**
 * The main Zettlr object. As long as this exists in memory, the app will run.
 * @type {Zettlr}
 */
let zettlr

/**
 * Global array containing files collected from argv before process start
 * @type {Array}
 */
global.filesToOpen = []

/**
 * This variable is false, if this process is the only one, or if there is
 * already one running on this system.
 * @type {Boolean}
 */
let isFirstInstance = app.requestSingleInstanceLock()
app.on('second-instance', (event, argv, cwd) => {
  // Retrieve all potential files from the list of arguments. Thanks to
  // Abricotine for this logic!
  // Taken from: https://github.com/brrd/Abricotine/blob/develop/app/abr-application.js
  argv = argv && argv.length > 0 ? argv : process.argv
  let files = argv.filter(function (element) {
    return element.substring(0, 2) !== '--' && isFile(element) && !ignoreFile(element)
  })

  // Someone tried to run a second instance, so focus the main window if existing
  if (zettlr) {
    let win = zettlr.getWindow().getWindow()
    if (win.isMinimized()) {
      win.restore()
    }
    win.focus()

    // In case the user wants to open a file/folder with this running instance
    zettlr.handleAddRoots(files)
  } else {
    // The Zettlr object has not yet been instantiated (e.g. the user double
    // clicked a file with Zettlr not being open or something like that.)
    // Workaround: Use the global array filesToOpen.
    global.filesToOpen = files
  }
})

/**
 * This gets executed when the user wants to open a file on macOS.
 */
app.on('open-file', (e, p) => {
  // The user wants to open a file -> simply handle it.
  if (zettlr) {
    zettlr.handleAddRoots([p])
  } else {
    // The Zettlr object has yet to be created -> use the global.
    global.filesToOpen = [p]
  }
})

/**
 * Hook into the ready event and initialize the main object creating everything
 * else. It is necessary to wait for the ready event, because prior, some APIs
 * may not work correctly.
 */
app.on('ready', function () {
  zettlr = new Zettlr(this)
})

/**
 * Quit as soon as all windows are closed and we are not on macOS.
 */
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    // Save config before exit.
    zettlr.shutdown()
    app.quit()
  }
})

/**
 * On macOS also hook into the will-quit event to save config.json and stats.JSON
 */
app.on('will-quit', function () {
  if (zettlr) zettlr.shutdown()
})

/**
 * On macOS, open a new window as soon as the user re-activates the app.
 */
app.on('activate', function () {
  zettlr.openWindow()
})

/**
 * Hook into the unhandledRejection-event to prevent nasty error messages when
 * a Promise is rejected somewhere.
 */
process.on('unhandledRejection', (err) => {
  // Just log to console.
  console.error('Received an unhandled rejection: ' + err.message)
})

/**
 * Quit if this is a second instance of Zettlr.
 * @param  {Boolean} isFirstInstance Whether or not this is a second instance.
 */
if (!isFirstInstance) {
  app.quit()
}
