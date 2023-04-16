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
import path from 'path'
import { bootApplication, shutdownApplication } from './app/lifecycle'

// Helper function to extract files to open from process.argv
import extractFilesFromArgv from './app/util/extract-files-from-argv'
import {
  DATA_DIR,
  DISABLE_HARDWARE_ACCELERATION,
  getCLIArgument,
  handleExitArguments
} from '@providers/cli-provider'
import { getAppServiceContainer, isAppServiceContainerReady } from './app/app-service-container'

handleExitArguments()

// Immediately after launch, check if there is already another instance of
// Zettlr running, and, if so, exit immediately. The arguments (including files)
// from this instance will already be passed to the first instance.
if (!app.requestSingleInstanceLock()) {
  if (!app.isPackaged) {
    // I always forget to close my system install before starting the
    // development app, so let's just add a small reminder to myself.
    console.log('There is another instance of Zettlr running. Did you forget to close that one?')
  }
  app.exit(0)
}

// If we reach this point, we are now booting the first instance of Zettlr.

// To show notifications properly on Windows, we must manually set the appUserModelID
// See https://www.electronjs.org/docs/tutorial/notifications#windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.zettlr.app')
}

// Setting custom data dir for user configuration files.
// Full path or relative path is OK. '~' does not work as expected.
let dataDir = getCLIArgument(DATA_DIR)

if (typeof dataDir === 'string') {
  // a path to a custom config dir is provided
  if (!path.isAbsolute(dataDir)) {
    if (app.isPackaged) {
      // Attempt to use the executable file's path as the basis
      dataDir = path.join(path.dirname(app.getPath('exe')), dataDir)
    } else {
      // Attempt to use the repository's root directory as the basis
      dataDir = path.join(__dirname, '../../', dataDir)
    }
  }

  if (isAppServiceContainerReady()) {
    getAppServiceContainer().log.info(`[Application] Using custom data dir: ${dataDir}`)
  }
  app.setPath('userData', dataDir)
  app.setAppLogsPath(path.join(dataDir, 'logs'))
}

// On systems with virtual GPUs (i.e. VMs), it might be necessary to disable
// hardware acceleration. If the corresponding flag is set, we do so.
// See for more info https://github.com/Zettlr/Zettlr/issues/2127
if (getCLIArgument(DISABLE_HARDWARE_ACCELERATION) === true) {
  app.disableHardwareAcceleration()
}

// *****************************************************************************

// This array will be only useful for macOS since there we have the "open-file"
// event indicating that the user wants to open a file. But this event might be
// emitted before the app is ready and the service container object has been
// instantiated. This is why we need to cache those in this array. After the app
// is booted, we won't need this anymore.
const filesBeforeOpen: string[] = []

/**
 * This variable is being used to determine if all service providers have
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
    getAppServiceContainer().commands.run('roots-add', filesBeforeOpen.concat(extractFilesFromArgv(process.argv)))
      .catch(err => console.error(err))
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
app.on('second-instance', (event, argv, _cwd) => {
  if (!isAppServiceContainerReady()) {
    return
  }

  const serviceContainer = getAppServiceContainer()

  serviceContainer.log.info('[Application] A second instance has been opened.')

  // openWindow calls the appropriate function of the windowManager, which deals
  // with the nitty-gritty of actually making the main window visible.
  serviceContainer.windows.showAnyWindow()

  // In case the user wants to open a file/folder with this running instance
  serviceContainer.commands?.run('roots-add', extractFilesFromArgv(argv))
    .catch(err => {
      serviceContainer.log.error('[Application] Error while adding new roots', err)
    })
})

/**
 * This gets executed when the user wants to open a file on macOS.
 */
app.on('open-file', (e, filePath) => {
  e.preventDefault() // Need to explicitly set this b/c we're handling this

  if (isAppServiceContainerReady()) {
    const serviceContainer = getAppServiceContainer()
    serviceContainer.commands.run('roots-add', [filePath])
      .catch((err) => {
        serviceContainer.log.error('[Application] Error while adding new roots', err)
      })
  } else {
    // The Zettlr object has yet to be created -> cache it
    filesBeforeOpen.push(filePath)
  }
})

/**
 * Quit as soon as all windows are closed. Except if
 * `system.leaveAppRunning` is true or on macOS.
 */
app.on('window-all-closed', function () {
  if (!isAppServiceContainerReady()) {
    return
  }

  const { config } = getAppServiceContainer()
  const { leaveAppRunning } = config.get().system
  if (!leaveAppRunning && process.platform !== 'darwin') {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
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

  shutdownApplication()
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
  if (isAppServiceContainerReady()) {
    getAppServiceContainer().windows.showAnyWindow()
  }
})

/**
 * Hook into the unhandledRejection-event to prevent nasty error messages when
 * a Promise is rejected somewhere.
 */
process.on('unhandledRejection', (err: any) => {
  // Just log to console.
  if (isAppServiceContainerReady()) {
    getAppServiceContainer().log.error('[Application] Unhandled rejection received', err)
  }
})
