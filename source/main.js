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

global.preBootLog = [{
  'level': 2, // Info
  // eslint-disable-next-line no-irregular-whitespace
  'message': `こんにちは！　Booting Zettlr at ${(new Date()).toString()}.`
}]

/**
 * This will be overwritten by the log provider, once it has booted
 */
global.log = {
  'verbose': (message) => {
    global.preBootLog.push({ 'level': 1, 'message': message })
  },
  'info': (message) => {
    global.preBootLog.push({ 'level': 2, 'message': message })
  },
  'warning': (message) => {
    global.preBootLog.push({ 'level': 3, 'message': message })
  },
  'error': (message) => {
    global.preBootLog.push({ 'level': 4, 'message': message })
  }
}

// We need the app and process modules.
const { app } = require('electron')
const process = require('process')

// Include the global Zettlr class
const Zettlr = require('./main/zettlr.js')

// Helpers to determine what files from argv we can open
const isFile = require('./common/util/is-file')
const ignoreFile = require('./common/util/ignore-file')

// Introduce v8 code caching
require('v8-compile-cache')

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
if (!isFirstInstance) app.exit(0)

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
    global.filesToOpen = global.filesToOpen.concat(files)
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
    global.filesToOpen.push(p)
  }
})

/**
 * Hook into the ready event and initialize the main object creating everything
 * else. It is necessary to wait for the ready event, because prior, some APIs
 * may not work correctly.
 */
app.whenReady().then(() => {
  global.log.info('Electron reports ready state. Instantiating main process...')

  try {
    // Developer tools
    const { default: installExtension, VUEJS_DEVTOOLS } = require('electron-devtools-installer')
    // Load Vue developer extension
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => global.log.info(`Added DevTools extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err))
  } catch (e) {
    global.log.verbose('Electron DevTools Installer not found - proceeding without loading developer tools.')
  }

  zettlr = new Zettlr()
})

/**
 * Quit as soon as all windows are closed and we are not on macOS.
 */
app.on('window-all-closed', async function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    // Shutdown the app before quitting
    await zettlr.shutdown()
    app.quit()
  }
})

/**
 * Hook into the will-quit event to make sure we are able to shut down our app
 * properly.
 */
app.on('will-quit', async function (event) {
  if (zettlr) await zettlr.shutdown()
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
  global.log.error(err.message)
})
