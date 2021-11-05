/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Window Manager
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The window manager is responsible for managing all
 *                  application windows and also maintain communication with
 *                  each and every window as well as displaying any prompts or
 *                  dialogs from the application.
 *
 * END HEADER
 */

import {
  app,
  screen,
  BrowserWindow,
  ipcMain,
  FileFilter,
  shell
} from 'electron'
import { promises as fs } from 'fs'
import EventEmitter from 'events'
import path from 'path'
import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '../fsal/types'
import createMainWindow from './create-main-window'
import createPrintWindow from './create-print-window'
import createUpdateWindow from './create-update-window'
import createLogWindow from './create-log-window'
import createStatsWindow from './create-stats-window'
import createQuicklookWindow from './create-ql-window'
import createPreferencesWindow from './create-preferences-window'
import createAboutWindow from './create-about-window'
import createTagManagerWindow from './create-tag-manager-window'
import createAssetsWindow from './create-assets-window'
import createProjectPropertiesWindow from './create-project-properties-window'
import createPasteImageModal from './create-paste-image-modal'
import createErrorModal from './create-error-modal'
import shouldOverwriteFileDialog from './dialog/should-overwrite-file'
import shouldReplaceFileDialog from './dialog/should-replace-file'
import askDirectoryDialog from './dialog/ask-directory'
import askSaveChanges from './dialog/ask-save-changes'
import promptDialog from './dialog/prompt'
import { WindowPosition } from './types.d'
import askFileDialog from './dialog/ask-file'
import saveFileDialog from './dialog/save-dialog'
import confirmRemove from './dialog/confirm-remove'
import * as bcp47 from 'bcp-47'

export default class WindowManager extends EventEmitter {
  private _mainWindow: BrowserWindow|null
  private readonly _qlWindows: Map<string, BrowserWindow>
  private _printWindow: BrowserWindow|null
  private _updateWindow: BrowserWindow|null
  private _logWindow: BrowserWindow|null
  private _statsWindow: BrowserWindow|null
  private _assetsWindow: BrowserWindow|null
  private _projectProperties: BrowserWindow|null
  private _preferences: BrowserWindow|null
  private _aboutWindow: BrowserWindow|null
  private _tagManager: BrowserWindow|null
  private _pasteImageModal: BrowserWindow|null
  private _errorModal: BrowserWindow|null
  private _printWindowFile: string|undefined
  private _windowState: Map<string, WindowPosition>
  private readonly _configFile: string
  private _fileLock: boolean
  private _persistTimeout: ReturnType<typeof setTimeout>|undefined
  private _beforeMainWindowCloseCallback: Function|null
  private readonly _hasRTLLocale: boolean

  constructor () {
    super()
    this._mainWindow = null
    this._qlWindows = new Map()
    this._printWindow = null
    this._updateWindow = null
    this._preferences = null
    this._aboutWindow = null
    this._tagManager = null
    this._pasteImageModal = null
    this._errorModal = null
    this._printWindowFile = undefined
    this._logWindow = null
    this._statsWindow = null
    this._assetsWindow = null
    this._projectProperties = null
    this._windowState = new Map()
    this._configFile = path.join(app.getPath('userData'), 'window_state.json')
    this._fileLock = false
    this._beforeMainWindowCloseCallback = null

    // Detect whether we have an RTL locale for correct traffic light positions.
    const schema = bcp47.parse(app.getLocale())

    /**
     * List of RTL languages, taken from https://ask.libreoffice.org/en/question/250893/
     */
    const LTR_SCRIPTS = [
      'ar', 'he', 'yi', 'ur', 'fa', 'ks', 'sd', 'ug',
      'ky', 'nqo', 'ckb', 'sdh', 'ku', 'hu', 'ms'
    ]

    if (schema.language !== null && LTR_SCRIPTS.includes(schema.language)) {
      this._hasRTLLocale = true
    } else {
      this._hasRTLLocale = false
    }

    // Immediately begin loading the data
    this.loadData()
      .then(() => {
        global.log.info('[Window Manager] Window Manager booted. Opening main window.')
        this.showMainWindow()
      })
      .catch((err: Error) => global.log.error(`[Window Manager] Could not load data: ${err.message}`, err))

    // Listen to window control commands
    ipcMain.on('window-controls', (event, message) => {
      const callingWindow = BrowserWindow.fromWebContents(event.sender)
      if (callingWindow === null) {
        return
      }

      const { command, payload } = message

      let itemPath: string = payload

      switch (command) {
        case 'win-maximise':
          if (callingWindow.isMaximized()) {
            callingWindow.unmaximize()
          } else {
            callingWindow.maximize()
          }
        // fall through
        case 'get-maximised-status':
          event.reply('window-controls', {
            command: 'get-maximised-status',
            payload: callingWindow.isMaximized()
          })
          break
        case 'win-minimise':
          callingWindow.minimize()
          break
        case 'win-close':
          callingWindow.close()
          break
        // This event is only important for macOS
        case 'get-traffic-lights-rtl':
          event.reply('window-controls', {
            command: 'traffic-lights-rtl',
            payload: this._hasRTLLocale // if RTL then also RTL traffic lights
          })
          break
        // Convenience APIs for the renderers to execute these commands
        case 'cut':
          event.sender.cut()
          break
        case 'copy':
          event.sender.copy()
          break
        case 'paste':
          event.sender.paste()
          break
        case 'selectAll':
          event.sender.selectAll()
          break
        case 'inspect-element':
          console.log(payload)
          event.sender.inspectElement(Math.round(payload.x), Math.round(payload.y))
          break
        case 'drag-start':
          app.getFileIcon(payload.filePath)
            .then((icon) => {
              event.sender.startDrag({ file: payload.filePath, icon: icon })
            })
            .catch(err => global.log.error(`[Window Manager] Could not fetch icon for path ${String(payload.filePath)}`, err))
          break
        case 'show-item-in-folder':
          if (itemPath.startsWith('safe-file://')) {
            itemPath = itemPath.replace('safe-file://', '')
          } else if (itemPath.startsWith('file://')) {
            itemPath = itemPath.replace('file://', '')
          }
          shell.showItemInFolder(itemPath)
          break
      }
    })

    /**
     * Handle incoming requests for files (on the operating system). This request
     * can be made by any renderer process. The window manager will prompt the
     * user for files corresponding to the given filters, and then return a list
     * of those selected.
     */
    ipcMain.handle('request-files', async (event, message) => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      // The client only can choose what and how much it wants to get
      let files = await this.askFile(
        message.filters,
        message.multiSelection,
        focusedWindow
      )
      return files
    })

    ipcMain.handle('request-dir', async (event, message) => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      let dir = await this.askDir(focusedWindow)
      return dir
    })
  }

  /**
   * Loads persisted window position data from disk
   */
  async loadData (): Promise<void> {
    try {
      const data = await fs.readFile(this._configFile, 'utf8')
      const tmpObject = JSON.parse(data)
      if (Array.isArray(tmpObject)) {
        // Old configuration object --> do not map!
        global.log.warning('[Window Manager] Detected an old windowState configuration file. Not retaining values!')
        return
      }
      global.log.info(`[Window Manager] Loading state information from ${this._configFile}`)
      this._windowState = new Map(Object.entries(tmpObject))
    } catch (err) {
      // Apparently no such file -> we'll leave the original (empty) array.
      global.log.info('[Window Manager] No window state information found.')
    }
  }

  /**
   * Sets a callback that will be called before the main window closes. Must
   * return false if the window should not be closed.
   *
   * @param   {Function}  callback  The callback that will be called. Must return boolean.
   */
  onBeforeMainWindowClose (callback: () => boolean): void {
    this._beforeMainWindowCloseCallback = callback
  }

  /**
   * Programmatically closes the main window if it is open.
   */
  closeMainWindow (): void {
    if (this._mainWindow !== null) {
      this._mainWindow.close()
    }
  }

  /**
   * Shuts down the window manager and performs final operations
   */
  shutdown (): void {
    this._persistWindowPositions()
  }

  /**
   * Listens to events on the main window
   */
  private _hookMainWindow (): void {
    if (this._mainWindow === null) {
      return
    }

    this._mainWindow.on('show', () => {
      global.tray.add()
    })

    // Listens to events from the window
    this._mainWindow.on('close', (event) => {
      // The user has requested the window to be closed -> first close
      // all other windows. NOTE: This also closes windows not instantiated
      // from within this class. This is a failsafe -- don't open windows outside
      // of the window manager.
      const allWindows = BrowserWindow.getAllWindows()
      for (const win of allWindows) {
        // Don't close the main window just yet. We are just preparing for the
        // shutdown by closing all other windows.
        if (win === this._mainWindow) {
          continue
        }

        win.close()
      }

      if (process.platform !== 'darwin' && Boolean(global.config.get('system.leaveAppRunning')) && !global.application.isQuitting()) {
        this._mainWindow?.hide()
        event.preventDefault()
      } else if (this._beforeMainWindowCloseCallback !== null) {
        const shouldClose: boolean = this._beforeMainWindowCloseCallback()
        if (!shouldClose) {
          event.preventDefault()
        }
      }
    }) // END: mainWindow.on(close)

    this._mainWindow.on('closed', () => {
      // The window has been closed -> dereference
      this._mainWindow = null
      this.emit('main-window-closed')
    })
  }

  /**
   * Makes a BrowserWindow visible and focuses it.
   *
   * @param  {BrowserWindow}  win  The window to make visible
   */
  private _makeVisible (win: BrowserWindow): void {
    win.show()
  }

  /**
   * Persists the window positions to disk
   */
  private _persistWindowPositions (): void {
    if (this._fileLock) {
      if (this._persistTimeout !== undefined) {
        clearTimeout(this._persistTimeout)
        this._persistTimeout = undefined
      }
      // Try again after one second, because there is currently data being written
      this._persistTimeout = setTimeout(() => {
        this._persistWindowPositions()
      }, 1000)
      return
    }

    const data = JSON.stringify(Object.fromEntries(this._windowState))
    this._fileLock = true
    fs.writeFile(this._configFile, data)
      .then(() => {
        this._fileLock = false
      })
      .catch((err) => {
        global.log.error(`[Window Manager] Could not persist data: ${err.message as string}`, err)
      })
  }

  /**
   * Returns a sanitised, ready to use WindowPosition, either from the saved
   * window states, or a brand new one. If no window position was found, a new
   * one will be created using the given default size.
   *
   * @param   {string}                   stateId      The window state to find
   * @param   {Electron.Rectangle|null}  defaultSize  An optional size. If null, will use half the screen.
   *
   * @return  {WindowPosition}                        A sanitised WindowPosition
   */
  private _retrieveWindowPosition (stateId: string, defaultSize: Electron.Rectangle|null): WindowPosition {
    if (!this._windowState.has(stateId)) {
      // Generate a default window position
      const { workArea, id } = screen.getPrimaryDisplay()
      const defaultPosition: WindowPosition = {
        // Some displays begin at a y > 0 and/or x > 0
        y: workArea.y + workArea.height * 0.25,
        x: workArea.x + workArea.width * 0.25,
        width: workArea.width / 2,
        height: workArea.height / 2,
        lastDisplayId: id,
        isMaximised: false
      }

      // If a defaultSize was passed, override the properties
      if (defaultSize !== null) {
        defaultPosition.y = defaultSize.y
        defaultPosition.x = defaultSize.x
        defaultPosition.width = defaultSize.width
        defaultPosition.height = defaultSize.height
      }

      this._updateWindowPosition(stateId, defaultPosition)
    } else {
      // We already have a position in our map, so retrieve, sanitize, and return.
      const existingPosition = this._windowState.get(stateId) as WindowPosition
      this._updateWindowPosition(stateId, existingPosition) // Sanitize the position
    }

    // At this point we will definitely have a WindowPosition for this window.
    return this._windowState.get(stateId) as WindowPosition
  }

  /**
   * Takes a WindowPosition and sets it for the window identified by stateId, after
   * sanitizing the window position correctly.
   *
   * @param   {string}          stateId   The unique stateId of the window, not to be confused with Electron's window ID.
   * @param   {WindowPosition}  position  The window position to be set.
   */
  private _updateWindowPosition (stateId: string, position: WindowPosition): void {
    // First, get the current display of the position. NOTE: We have to construct
    // a new object since getDisplayMatching requires integers
    const { id, workArea } = screen.getDisplayMatching({
      x: Math.round(position.x),
      y: Math.round(position.y),
      width: Math.round(position.width),
      height: Math.round(position.height)
    })
    position.lastDisplayId = id

    // Then, make sure that all bounds are still good to go
    if (position.width > workArea.width) {
      position.width = workArea.width
    }

    if (position.height > workArea.height) {
      position.height = workArea.height
    }

    if (position.x + position.width > workArea.x + workArea.width) {
      position.x = workArea.x
    }

    if (position.y + position.height > workArea.y + workArea.height) {
      position.y = workArea.y
    }

    position.isMaximised = position.width === workArea.width && position.height === workArea.height

    // Finally, overwrite the position we have.
    this._windowState.set(stateId, position)
    this._persistWindowPositions()
  }

  /**
   * This function hooks a callback to various resizing events of the provided
   * window in order to update the provided configuration object in-place.
   *
   * @param   {BrowserWindow}   window  The window to hook
   * @param   {WindowPosition}  conf    The configuration to update
   */
  private _hookWindowResize (window: BrowserWindow, stateId: string): void {
    const callback = (): void => {
      const { id } = screen.getDisplayMatching(window.getBounds())

      const newPosition: WindowPosition = {
        ...window.getBounds(),
        lastDisplayId: id,
        isMaximised: window.isMaximized()
      }

      this._updateWindowPosition(stateId, newPosition)
      window.webContents.send('window-controls', {
        command: 'get-maximised-status',
        payload: window.isMaximized()
      })
    }

    window.on('resize', callback)
    window.on('move', callback)
    window.on('maximize', callback)
    window.on('unmaximize', callback)
  }

  /**
   * Shows the main window
   */
  showMainWindow (): void {
    if (this._mainWindow === null) {
      const { workArea } = screen.getPrimaryDisplay()
      const windowConfiguration = this._retrieveWindowPosition('main', {
        y: workArea.y,
        x: workArea.x,
        width: workArea.width,
        height: workArea.height
      })

      this._mainWindow = createMainWindow(windowConfiguration)
      this._hookMainWindow()
      this._hookWindowResize(this._mainWindow, 'main')
    } else {
      this._makeVisible(this._mainWindow)
    }
  }

  /**
   * Shows any window. If none are open, the main window will be opened and shown.
   */
  showAnyWindow (): void {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) {
      this.showMainWindow()
    } else {
      this._makeVisible(windows[0])
    }
  }

  /**
   * Opens a new Quicklook window for the given file.
   *
   * @param   {MDFileDescriptor}  file  The file to display in the Quicklook
   */
  showQuicklookWindow (file: MDFileDescriptor): void {
    if (this._qlWindows.has(file.path)) {
      // The window is already open -> make it visible
      this._makeVisible(this._qlWindows.get(file.path) as BrowserWindow)
    } else {
      // This particular file is not yet open
      const conf = this._retrieveWindowPosition(file.path, null)
      const window = createQuicklookWindow(file, conf)
      this._hookWindowResize(window, file.path)
      this._qlWindows.set(file.path, window)
      window.on('closed', () => { this._qlWindows.delete(file.path) })
    }
  }

  /**
   * Displays the log window
   */
  showLogWindow (): void {
    if (this._logWindow === null) {
      const conf = this._retrieveWindowPosition('log', null)
      this._logWindow = createLogWindow(conf)
      this._hookWindowResize(this._logWindow, 'log')

      // Dereference the window as soon as it is closed
      this._logWindow.on('closed', () => {
        this._logWindow = null
      })
    } else {
      this._makeVisible(this._logWindow)
    }
  }

  /**
   * Displays the defaults window
   */
  showDefaultsWindow (): void {
    if (this._assetsWindow === null) {
      const conf = this._retrieveWindowPosition('assets', null)
      this._assetsWindow = createAssetsWindow(conf)
      this._hookWindowResize(this._assetsWindow, 'assets')

      // Dereference the window as soon as it is closed
      this._assetsWindow.on('closed', () => {
        this._assetsWindow = null
      })
    } else {
      this._makeVisible(this._assetsWindow)
    }
  }

  /**
   * Shows the statistics window
   */
  showStatsWindow (): void {
    if (this._statsWindow === null) {
      const conf = this._retrieveWindowPosition('stats', null)
      this._statsWindow = createStatsWindow(conf)
      this._hookWindowResize(this._statsWindow, 'stats')

      this._statsWindow.on('closed', () => {
        this._statsWindow = null
      })
    } else {
      this._makeVisible(this._statsWindow)
    }
  }

  /**
   * Shows the preferences window
   */
  showPreferences (): void {
    if (this._preferences === null) {
      const { workArea } = screen.getPrimaryDisplay()
      const conf = this._retrieveWindowPosition('preferences', {
        width: 700,
        height: 800,
        x: (workArea.width - 700) / 2,
        y: (workArea.height - 800) / 2
      })
      this._preferences = createPreferencesWindow(conf)
      this._hookWindowResize(this._preferences, 'preferences')

      // Dereference the window as soon as it is closed
      this._preferences.on('closed', () => {
        this._preferences = null
      })
    } else {
      this._makeVisible(this._preferences)
    }
  }

  /**
   * Shows the About window
   */
  showAboutWindow (): void {
    if (this._aboutWindow === null) {
      const { workArea } = screen.getPrimaryDisplay()
      const conf = this._retrieveWindowPosition('about', {
        width: 600,
        height: 500,
        y: (workArea.height - 500) / 2,
        x: (workArea.width - 600) / 2
      })
      this._aboutWindow = createAboutWindow(conf)
      this._hookWindowResize(this._aboutWindow, 'about')

      // Dereference the window as soon as it is closed
      this._aboutWindow.on('closed', () => {
        this._aboutWindow = null
      })
    } else {
      this._makeVisible(this._aboutWindow)
    }
  }

  /**
   * Shows the tag manager window
   */
  showTagManager (): void {
    if (this._tagManager === null) {
      const conf = this._retrieveWindowPosition('tag-manager', null)
      this._tagManager = createTagManagerWindow(conf)
      this._hookWindowResize(this._tagManager, 'tag-manager')

      // Dereference the window as soon as it is closed
      this._tagManager.on('closed', () => {
        this._tagManager = null
      })
    } else {
      this._makeVisible(this._tagManager)
    }
  }

  /**
   * Shows the paste image modal and, after closing, returns
   */
  async showPasteImageModal (startPath: string): Promise<any> {
    return await new Promise((resolve, reject) => {
      if (this._mainWindow === null) {
        return reject(new Error('[Window Manager] A paste image modal was requested, but there was no main window open.'))
      }
      this._pasteImageModal = createPasteImageModal(this._mainWindow, startPath)

      ipcMain.on('paste-image-ready', (event, data) => {
        // Resolve now
        resolve(data)
        this._pasteImageModal?.close()
      })

      // Dereference the modal as soon as it is closed
      this._pasteImageModal.on('closed', () => {
        ipcMain.removeAllListeners('paste-image-ready') // Not to have a dangling listener hanging around
        resolve(undefined) // Resolve with undefined to indicate that the user has aborted
        this._pasteImageModal = null
      })
    })
  }

  /**
   * Shows an error message.
   *
   * @param   {string}  title     The message's title
   * @param   {string}  message   The actual message
   * @param   {string}  contents  Optional further contents
   */
  showErrorMessage (title: string, message: string, contents?: string): void {
    if (this._mainWindow === null) {
      global.log.error('[Application] Could not display error message, because the main window was not open!', message)
      return
    }

    if (this._errorModal !== null) {
      this._errorModal.close()
      // Dereference
      this._errorModal = null
    }

    this._errorModal = createErrorModal(this._mainWindow, title, message, contents)

    // Dereference the window as soon as it is closed
    this._errorModal.on('closed', () => {
      this._errorModal = null
    })
  }

  /**
   * Opens the print window with the given file
   *
   * @param   {string}  filePath  The file to load
   */
  showPrintWindow (filePath: string): void {
    if (this._printWindow === null) {
      const conf = this._retrieveWindowPosition('print', null)
      this._printWindow = createPrintWindow(filePath, conf)
      this._hookWindowResize(this._printWindow, 'print')
      this._printWindowFile = filePath

      // Dereference the window as soon as it is closed
      this._printWindow.on('closed', () => {
        this._printWindow = null
        this._printWindowFile = undefined
      })
    } else if (this._printWindowFile === filePath) {
      this._makeVisible(this._printWindow)
    } else {
      // There is a print window, but a different file was requested.
      // In this case, close the current print window and call this function
      // again so that the first if is executed
      this._printWindow.close()
      this.showPrintWindow(filePath)
    }
  }

  /**
   * Opens the project properties window with the given directory
   *
   * @param   {string}  dirPath  The directory to load
   */
  showProjectPropertiesWindow (dirPath: string): void {
    if (this._projectProperties === null) {
      const conf = this._retrieveWindowPosition('print', null)
      this._projectProperties = createProjectPropertiesWindow(conf, dirPath)
      this._hookWindowResize(this._projectProperties, 'project-properties')

      // Dereference the window as soon as it is closed
      this._projectProperties.on('closed', () => {
        this._projectProperties = null
      })
    } else {
      // We do not re-open the window with a (possibly changed) directory
      // because it might contain unsaved changes. The user has to manually
      // close it.
      this._makeVisible(this._projectProperties)
    }
  }

  /**
   * Opens the updater window
   */
  showUpdateWindow (): void {
    if (this._updateWindow === null) {
      const { workArea } = screen.getPrimaryDisplay()
      const conf = this._retrieveWindowPosition('updater', {
        width: 300,
        height: 500,
        x: (workArea.height - 500) / 2,
        y: (workArea.width - 300) / 2
      })
      this._updateWindow = createUpdateWindow(conf)
      this._hookWindowResize(this._updateWindow, 'updater')

      this._updateWindow.on('closed', () => { this._updateWindow = null })
    } else {
      this._makeVisible(this._updateWindow)
    }
  }

  /**
   * Sets the main window's modification flag
   *
   * @param   {boolean}  modificationState  Whether to indicate a modification
   */
  setModified (modificationState: boolean): void {
    if (this._mainWindow !== null && process.platform === 'darwin') {
      this._mainWindow.setDocumentEdited(modificationState)
    }
  }

  /**
   * Returns the main window
   *
   * @return  {BrowserWindow|null}  The main window
   */
  getMainWindow (): BrowserWindow|null {
    return this._mainWindow
  }

  // ######################### DIALOG BOXES ####################################

  /**
   * Asks the user for confirmation whether to replace an opened file with a
   * newer version.
   *
   * @param {string}   filename The filename to be displayed.
   * @return {boolean} True if the file should be replaced
   */
  async shouldReplaceFile (filename: string): Promise<boolean> {
    if (this._mainWindow === null) {
      // If the main window is not open, there is no sense in showing this
      // box, as the file is not really "open". It will be shown once a new
      // main window is opened, but then the file contents will be loaded from
      // disk either way.
      return true
    }

    return await shouldReplaceFileDialog(this._mainWindow, filename)
  }

  /**
    * Ask whether or not the user wants to replace a certain file.
    * @param   {string} filename The filename that should be contained in the message
    * @return  {boolean}         Resolves with true if the file should be overwritten
    */
  async shouldOverwriteFile (filename: string): Promise<boolean> {
    return await shouldOverwriteFileDialog(this._mainWindow, filename)
  }

  /**
   * Asks the user whether or not to persist or drop changes to their files. It
   * returns the ID of the clicked button in the message box, which is 0 to
   * simply drop changes, 1 to abort closing in order to save. TODO: Enable auto-save
   *
   * @return  {Promise<any>}  Returns the message box results
   */
  async askSaveChanges (): Promise<any> {
    return await askSaveChanges(this._mainWindow)
  }

  /**
    * Show the dialog for choosing a directory
    * @return {string[]} An array containing all selected paths.
    */
  async askDir (win?: BrowserWindow|null): Promise<string[]> {
    if (win != null) {
      return await askDirectoryDialog(win)
    } else {
      return await askDirectoryDialog(this._mainWindow)
    }
  }

  /**
   * Shows the dialog for importing files from the disk.
   *
   * @param  {FileFilter[]|null}   [filters=null]    An array of extension filters.
   * @param  {boolean}             [multiSel=false]  Determines if multiple files are allowed
   * @param  {string?}             startdir          Optional start directory override
   * @param  {BrowserWindow|null}  [win]             An optional window to attach to
   *
   * @return {string[]}                              An array containing all selected files.
   */
  async askFile (filters: FileFilter[]|null = null, multiSel: boolean = false, win?: BrowserWindow|null): Promise<string[]> {
    if (win != null) {
      return await askFileDialog(win, filters, multiSel)
    } else {
      return await askFileDialog(this._mainWindow, filters, multiSel)
    }
  }

  /**
   * Allows the user to save a file.
   *
   * @param   {string}              fileOrPathName   Either an absolute path (in
   *                                                 which case the directory will
   *                                                 be set as the starting
   *                                                 directory) or just a filename,
   *                                                 in which case the last known
   *                                                 dialogPaths.askFileDialog path
   *                                                 will be used.
   * @param   {BrowserWindow|null}  win              The window to attach to
   *
   * @return  {Promise<string|undefined>}            Resolves with a path or undefined
   */
  async saveFile (fileOrPathName: string, win?: BrowserWindow|null): Promise<string|undefined> {
    if (win != null) {
      return await saveFileDialog(win, fileOrPathName)
    } else {
      return await saveFileDialog(this._mainWindow, fileOrPathName)
    }
  }

  /**
    * This function prompts the user with information.
    * @param  {any} options Necessary informations for displaying the prompt
    */
  prompt (options: any): void {
    promptDialog(this._mainWindow, options)
  }

  /**
    * Ask to remove the associated path for the descriptor
    * @param  {MDFileDescriptor|DirDescriptor} descriptor The corresponding descriptor
    * @return {boolean}                                   True if user wishes to remove it.
    */
  async confirmRemove (descriptor: MDFileDescriptor|CodeFileDescriptor|DirDescriptor): Promise<boolean> {
    return await confirmRemove(this._mainWindow, descriptor)
  }
}
