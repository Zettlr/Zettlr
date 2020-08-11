/**
 * @ignore
 * BEGIN HEADER
 *
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

import { app, protocol } from 'electron'

// Include the global Zettlr class
import Zettlr from './main/zettlr'

// Helper function to extract files to open from process.argv
import extractFilesFromArgv from './common/util/extract-files-from-argv'

// Developer tools
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'

global.preBootLog = [{
  'level': 2, // Info
  // eslint-disable-next-line no-irregular-whitespace
  'message': `こんにちは！　Booting Zettlr at ${(new Date()).toString()}.`
}]

/**
 * This will be overwritten by the log provider, once it has booted
 */
global.log = {
  'verbose': (message: string) => {
    global.preBootLog.push({ 'level': 1, 'message': message })
  },
  'info': (message: string) => {
    global.preBootLog.push({ 'level': 2, 'message': message })
  },
  'warning': (message: string) => {
    global.preBootLog.push({ 'level': 3, 'message': message })
  },
  'error': (message: string) => {
    global.preBootLog.push({ 'level': 4, 'message': message })
  }
}

/**
 * The main Zettlr object. As long as this exists in memory, the app will run.
 * @type {Zettlr}
 */
let zettlr: Zettlr

/**
 * Global array containing files collected from argv before process start
 * @type {Array}
 */
global.filesToOpen = extractFilesFromArgv() // Will automatically filter these out

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
 * NOTE from the electron docs: This event is guaranteed to be emitted after
 * the ready event of app gets emitted.
 * @param {Object} event The instance event
 * @param {Array} argv The arguments the second instance had received
 * @param {String} cwd The current working directory
 */
app.on('second-instance', (event, argv, cwd) => {
  let files = extractFilesFromArgv(argv) // Override process.argv with the correct one

  if (files.length === 0) return // Nothing to do

  global.log.info(`Opening ${files.length} files from a second instance.`, files)

  let win = zettlr.getWindow().getWindow()
  if (!win) {
    zettlr.getWindow().open()
  } else {
    // Restore the window in case it's minimised
    if (win.isMinimized()) win.restore()
    win.focus()
  }

  // In case the user wants to open a file/folder with this running instance
  zettlr.handleAddRoots(files)
})

/**
 * This gets executed when the user wants to open a file on macOS.
 */
app.on('open-file', (e, p) => {
  e.preventDefault() // Need to explicitly set this b/c we're handling this
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
    // Load Vue developer extension
    installExtension(VUEJS_DEVTOOLS)
      .then((name: string) => global.log.info(`Added DevTools extension:  ${name}`))
      .catch((err: any) => console.log('An error occurred: ', err))
  } catch (e) {
    global.log.verbose('Electron DevTools Installer not found - proceeding without loading developer tools.')
  }

  // Make it possible to safely load external files
  // In order to load files, the 'safe-file' protocol has to be used instead of 'file'
  // https://stackoverflow.com/a/61623585/873661
  const protocolName = 'safe-file'
  protocol.registerFileProtocol(protocolName, (request, callback) => {
    const url = request.url.replace(`${protocolName}://`, '')
    try {
      return callback({
        path: decodeURIComponent(url),
        // Prevent that local files are cached
        headers: {'Cache-control': 'no-store', 'pragma': 'no-cache' }
      })
    } catch (error) {
      global.log.error('Error loading external file', error)
    }
  })

  zettlr = new Zettlr()
})

/**
 * Quit as soon as all windows are closed and we are not on macOS.
 */
app.on('window-all-closed', async function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    try {
      // Shutdown the app before quitting
      await zettlr.shutdown()
    } catch (e) {
      // Using a try/catch we prevent potential zombie processes. The console
      // is here to inform the devs in case there's weird behaviour, so we can
      // double-check if there's an error, e.g., in the provider shutdowns.
      // This makes sure the app quits correctly on user systems, whereas we
      // can have a look at the console for that.
      console.error(e)
    }
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
process.on('unhandledRejection', (err: any) => {
  // Just log to console.
  global.log.error(err.message)
})
