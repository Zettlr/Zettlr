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
 *                  Listen to app-Events and initialize the Gettlr object.
 *
 * END HEADER
 */

global.preBootLog = [{
  'level': 2, // Info
  // eslint-disable-next-line no-irregular-whitespace
  'message': `こんにちは！　Booting Gettlr at ${(new Date()).toString()}.`
}]

// We need the app and process modules.
const { app } = require('electron')
const process = require('process')

// Include the global Gettlr class
const gettlr = require('./main/Gettlr.js')

// Helpers to determine what files from argv we can open
const isFile = require('./common/util/is-file')
const ignoreFile = require('./common/util/ignore-file')

// Introduce v8 code caching
require('v8-compile-cache')

/**
 * The main Gettlr object. As long as this exists in memory, the app will run.
 * @type {Gettlr}
 */
let Gettlr

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
 * Exit immediately if this is a second instance of Gettlr.
 * @param  {Boolean} isFirstInstance Whether or not this is a second instance.
 */
if (!isFirstInstance) app.exit(0)

/**
 * This event will be called if another instance of Gettlr has been opened with
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
  if (Gettlr) {
    // We need to call the open() method of GettlrWindow to make sure there's a
    // window, because on Windows, where this code is always executed, Gettlr
    // instances can enter a zombie mode in which the instances still run although
    // the Window has been closed (due to the close event not being fired in rare
    // instances). This way we make sure there's a window open in any case before
    // it's accessed.
    Gettlr.getWindow().open() // Will simply return if the window is already open
    let win = Gettlr.getWindow().getWindow()
    // Restore the window in case it's minimised
    if (win.isMinimized()) win.restore()
    win.focus()

    // In case the user wants to open a file/folder with this running instance
    Gettlr.handleAddRoots(files)
  } else {
    // The Gettlr object has not yet been instantiated (e.g. the user double
    // clicked a file with Gettlr not being open or something like that.)
    // Workaround: Use the global array filesToOpen.
    global.filesToOpen = global.filesToOpen.concat(files)
  }
})

/**
 * This gets executed when the user wants to open a file on macOS.
 */
app.on('open-file', (e, p) => {
  // The user wants to open a file -> simply handle it.
  if (Gettlr) {
    Gettlr.handleAddRoots([p])
  } else {
    // The Gettlr object has yet to be created -> use the global.
    global.filesToOpen.push(p)
  }
})

/**
 * Hook into the ready event and initialize the main object creating everything
 * else. It is necessary to wait for the ready event, because prior, some APIs
 * may not work correctly.
 */
app.on('ready', function () {
  global.preBootLog.push({
    'level': 2, // Info
    'message': 'Electron reports ready state. Instantiating main process...'
  })
  Gettlr = new gettlr()
})

/**
 * Quit as soon as all windows are closed and we are not on macOS.
 */
app.on('window-all-closed', async function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    // Shutdown the app before quitting
    await Gettlr.shutdown()
    app.quit()
  }
})

/**
 * Hook into the will-quit event to make sure we are able to shut down our app
 * properly.
 */
app.on('will-quit', async function (event) {
  if (Gettlr) await Gettlr.shutdown()
})

/**
 * On macOS, open a new window as soon as the user re-activates the app.
 */
app.on('activate', function () {
  Gettlr.openWindow()
})

/**
 * Hook into the unhandledRejection-event to prevent nasty error messages when
 * a Promise is rejected somewhere.
 */
process.on('unhandledRejection', (err) => {
  // Just log to console.
  global.log.error(err.message)
})
