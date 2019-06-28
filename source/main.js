/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        main.js
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the procedural file for the main process. It is
 *                  the main entry point for the application. What it does:
 *                  Listen to app-Events and initialize the Zettlr object.
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

const isFile = require('./common/util/is-file')
const ignoreFile = require('./common/util/ignore-file')

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
 * This variable is true, if this process is the only one, or false if there is
 * already one running on this system.
 * @type {Boolean}
 */
let isFirstInstance = app.requestSingleInstanceLock()

/**
 * Exit immediately if this is a second instance of Zettlr.
 * @param  {Boolean} isFirstInstance Whether or not this is a second instance.
 */
if (!isFirstInstance) {
  app.exit(0)
}

/**
 * This event will be called if another instance of Zettlr has been opened with
 * the argv of that instance.
 * @param {Object} event The instance event
 * @param {Array} argv The arguments the second instance had received
 * @param {String} cwd The current working directory
 */
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
    // We need to call the open() method of ZettlrWindow to make sure there's a
    // window, because on Windows, where this code is always executed, Zettlr
    // instances can enter a zombie mode in which the instances still run although
    // the Window has been closed (due to the close event not being fired in rare
    // instances). This way we make sure there's a window open in any case before
    // it's accessed.
    zettlr.getWindow().open() // Will simply return if the window is already open
    let win = zettlr.getWindow().getWindow()
    // Restore the window in case it's minimised
    if (win.isMinimized()) win.restore()
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
    // Shutdown the app before quitting
    zettlr.shutdown()
    app.quit()
  }
})

/**
 * Hook into the will-quit event to make sure we are able to shut down our app
 * properly.
 */
app.on('will-quit', function (event) {
  if (zettlr) {
    zettlr.shutdown()
    app.quit()
  }
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
  console.error(err)
})
