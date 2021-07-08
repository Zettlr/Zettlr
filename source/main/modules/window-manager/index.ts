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
import createDefaultsWindow from './create-defaults-window'
import createPasteImageModal from './create-paste-image-modal'
import createErrorModal from './create-error-modal'
import shouldOverwriteFileDialog from './dialog/should-overwrite-file'
import shouldReplaceFileDialog from './dialog/should-replace-file'
import askDirectoryDialog from './dialog/ask-directory'
import askSaveChanges from './dialog/ask-save-changes'
import promptDialog from './dialog/prompt'
import sanitizeWindowPosition from './sanitize-window-position'
import { WindowPosition } from './types.d'
import askFileDialog from './dialog/ask-file'
import saveFileDialog from './dialog/save-dialog'
import confirmRemove from './dialog/confirm-remove'
import * as bcp47 from 'bcp-47'
// import dragIcon from '../../assets/dragicon.png'

interface QuicklookRecord {
  path: string
  win: BrowserWindow
}

export default class WindowManager {
  private _mainWindow: BrowserWindow|null
  private readonly _qlWindows: QuicklookRecord[]
  private _printWindow: BrowserWindow|null
  private _updateWindow: BrowserWindow|null
  private _logWindow: BrowserWindow|null
  private _statsWindow: BrowserWindow|null
  private _defaultsWindow: BrowserWindow|null
  private _preferences: BrowserWindow|null
  private _aboutWindow: BrowserWindow|null
  private _tagManager: BrowserWindow|null
  private _pasteImageModal: BrowserWindow|null
  private _errorModal: BrowserWindow|null
  private _printWindowFile: string|undefined
  private _windowState: WindowPosition[]
  private readonly _configFile: string
  private _fileLock: boolean
  private _persistTimeout: ReturnType<typeof setTimeout>|undefined
  private _beforeMainWindowCloseCallback: Function|null
  private readonly _hasRTLLocale: boolean

  constructor () {
    this._mainWindow = null
    this._qlWindows = []
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
    this._defaultsWindow = null
    this._windowState = []
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
          event.sender.inspectElement(payload.x, payload.y)
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
      this._windowState = JSON.parse(data) as WindowPosition[]
    } catch (err) {
      // Apparently no such file -> we'll leave the original (empty) array.
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

        // Now find the window to close. Emit a warning if the window is not
        // handled by the Window manager, as this indicates a bug and helps us
        // centralise everything here.
        if (this._qlWindows.find(record => record.win === win) !== undefined) {
          const idx = this._qlWindows.findIndex(record => record.win === win)
          win.close()
          this._qlWindows.splice(idx, 1)
        } else if (this._printWindow === win) {
          win.close()
          this._printWindow = null
        } else if (this._logWindow === win) {
          win.close()
          this._logWindow = null
        } else {
          global.log.warning(`[Window Manager] The window "${win.getTitle()}" (ID: ${win.id}) is not managed by the window manager.`)
          win.close()
        }
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

    const data = JSON.stringify(this._windowState)
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
   * @param   {string}                          type         The window state to find
   * @param   {Rect|null}                       defaultSize  An optional size. If null, will use half the screen.
   * @param   {Record<string><WindowPosition>}  predicate    Optional WindowPosition attributes to look for
   *
   * @return  {WindowPosition}                               A sanitised WindowPosition
   */
  private _retrieveWindowPosition (type: string, defaultSize: Rect|null, predicate?: Record<string, any>): WindowPosition {
    let windowConfiguration = this._windowState.find(state => {
      if (state.windowType !== type) {
        return false
      }

      if (predicate !== undefined) {
        for (const property in predicate) {
          // If property is not, in fact, a property of WindowPosition, it'll
          // be undefined, and therefore probably not === to the predicate.
          if (predicate[property] === state[property as keyof WindowPosition]) {
            return false
          }
        }
      }

      return true
    })

    if (windowConfiguration === undefined) {
      // Create a new default configuration
      const display = screen.getPrimaryDisplay()

      // Make a window half the size of the current primary display, if no
      // sizes were passed.
      if (defaultSize === null) {
        const width = Math.min(display.workArea.width, display.workArea.width / 2)
        const height = Math.min(display.workArea.height, display.workArea.height / 2)
        const top = (display.workArea.height - height) / 2
        const left = (display.workArea.width - width) / 2
        defaultSize = {
          top: display.workArea.y + top, // Some displays begin at a y > 0
          left: display.workArea.x + left, // Same as with the y-value
          width: width,
          height: height
        }
      }

      // Determine if the window should show up maximised
      let maximised = false
      if (defaultSize.top === display.workArea.y &&
        defaultSize.left === display.workArea.x &&
        defaultSize.width === display.workArea.width &&
        defaultSize.height === display.workArea.height
      ) {
        maximised = true
      }

      // Create the configuration object
      windowConfiguration = {
        windowType: type,
        top: defaultSize.top,
        left: defaultSize.left,
        width: defaultSize.width,
        height: defaultSize.height,
        isMaximised: maximised,
        lastDisplayId: display.id
      }

      if (predicate !== undefined) {
        // Add the predicates to the WindowConfiguration so the next filter won't
        // return undefined.
        for (const property in predicate) {
          windowConfiguration[property] = predicate[property]
        }
      }

      this._windowState.push(windowConfiguration)
    }

    // Sanitise the configuration and then replace the one in our window state
    const saneConfiguration = sanitizeWindowPosition(windowConfiguration)
    this._windowState.splice(this._windowState.indexOf(windowConfiguration), 1, saneConfiguration)

    return saneConfiguration
  }

  /**
   * This function hooks a callback to various resizing events of the provided
   * window in order to update the provided configuration object in-place.
   *
   * @param   {BrowserWindow}   window  The window to hook
   * @param   {WindowPosition}  conf    The configuration to update
   */
  private _hookWindowResize (window: BrowserWindow, conf: WindowPosition): void {
    const callback = (): void => {
      let newBounds = window.getBounds()
      // The configuration object will be edited in place.
      conf.top = newBounds.y
      conf.left = newBounds.x
      conf.width = newBounds.width
      conf.height = newBounds.height
      // On macOS there's no "unmaximize", therefore we have to check manually.
      const workArea = screen.getDisplayMatching(newBounds).workArea
      conf.isMaximised = (
        newBounds.width === workArea.width &&
        newBounds.height === workArea.height &&
        newBounds.x === workArea.x &&
        newBounds.y === workArea.y
      )
      // Persist the new window positions and notify the window of its own
      // new size
      this._persistWindowPositions()
      window.webContents.send('window-controls', {
        command: 'get-maximised-status',
        payload: window.isMaximized()
      })
    }

    window.on('resize', callback)
    window.on('move', callback)

    // Now hook the resizing events to save the last positions to config
    window.on('maximize', () => {
      conf.isMaximised = true
      // Persist the new window positions and notify the window of its own
      // new size
      this._persistWindowPositions()
      window.webContents.send('window-controls', {
        command: 'get-maximised-status',
        payload: window.isMaximized()
      })
    })
    window.on('unmaximize', () => {
      conf.isMaximised = false
      // Persist the new window positions and notify the window of its own
      // new size
      this._persistWindowPositions()
      window.webContents.send('window-controls', {
        command: 'get-maximised-status',
        payload: window.isMaximized()
      })
    })
  }

  /**
   * Shows the main window
   */
  showMainWindow (): void {
    if (this._mainWindow === null) {
      const display = screen.getPrimaryDisplay()
      const windowConfiguration = this._retrieveWindowPosition('main', {
        top: display.workArea.y,
        left: display.workArea.x,
        width: display.workArea.width,
        height: display.workArea.height
      })

      this._mainWindow = createMainWindow(windowConfiguration)
      this._hookMainWindow()
      this._hookWindowResize(this._mainWindow, windowConfiguration)
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
    // Opens a new Quicklook. It's called new because there can be multiple
    // Quicklook windows.

    // First, let's make sure the file is not yet open
    const record = this._qlWindows.find(record => record.path === file.path)

    if (record !== undefined) {
      // The window is already open -> make it visible
      this._makeVisible(record.win)
    } else {
      // This particular file is not yet open -> open it
      // Pass null for default size
      const conf = this._retrieveWindowPosition('quicklook', null, { quicklookFile: file.path })
      const window: BrowserWindow = createQuicklookWindow(file, conf)
      this._hookWindowResize(window, conf)

      const qlWindow: QuicklookRecord = {
        path: file.path,
        win: window
      }

      // As soon as the window is closed, remove it from our array.
      window.on('closed', () => {
        const record = this._qlWindows.find(record => record.win === window)
        if (record !== undefined) {
          this._qlWindows.splice(this._qlWindows.indexOf(record), 1)
        }
      })

      this._qlWindows.push(qlWindow)
    }
  }

  /**
   * Displays the log window
   */
  showLogWindow (): void {
    if (this._logWindow === null) {
      const conf = this._retrieveWindowPosition('log', null)
      this._logWindow = createLogWindow(conf)
      this._hookWindowResize(this._logWindow, conf)

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
    if (this._defaultsWindow === null) {
      const conf = this._retrieveWindowPosition('log', null)
      this._defaultsWindow = createDefaultsWindow(conf)
      this._hookWindowResize(this._defaultsWindow, conf)

      // Dereference the window as soon as it is closed
      this._defaultsWindow.on('closed', () => {
        this._defaultsWindow = null
      })
    } else {
      this._makeVisible(this._defaultsWindow)
    }
  }

  /**
   * Shows the statistics window
   */
  showStatsWindow (): void {
    if (this._statsWindow === null) {
      const conf = this._retrieveWindowPosition('stats', null)
      this._statsWindow = createStatsWindow(conf)
      this._hookWindowResize(this._statsWindow, conf)

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
      const conf = this._retrieveWindowPosition('preferences', null)
      this._preferences = createPreferencesWindow(conf)
      this._hookWindowResize(this._preferences, conf)

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
      const display = screen.getPrimaryDisplay()
      const conf = this._retrieveWindowPosition('about', {
        width: 600,
        height: 500,
        top: (display.workArea.height - 500) / 2,
        left: (display.workArea.width - 600) / 2
      })
      this._aboutWindow = createAboutWindow(conf)
      this._hookWindowResize(this._aboutWindow, conf)

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
      this._hookWindowResize(this._tagManager, conf)

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
      this._hookWindowResize(this._printWindow, conf)
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
   * Opens the updater window
   */
  showUpdateWindow (): void {
    if (this._updateWindow === null) {
      const conf = this._retrieveWindowPosition('updater', null)
      this._updateWindow = createUpdateWindow(conf)
      this._hookWindowResize(this._updateWindow, conf)

      // Dereference the window as soon as it is closed
      this._updateWindow.on('closed', () => {
        this._updateWindow = null
      })
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
   * @param  {BrowserWindow|null}  [win]             An optional window to attach to
   *
   * @return {string[]}                             An array containing all selected files.
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
   * @param   {string}                 filename  An initial filename to display
   * @param   {BrowserWindow<string>}  win       The window to attach to
   *
   * @return  {Promise<string|undefined>}        Resolves with a path or undefined
   */
  async saveFile (filename: string, win?: BrowserWindow|null): Promise<string|undefined> {
    if (win != null) {
      return await saveFileDialog(win, filename)
    } else {
      return await saveFileDialog(this._mainWindow, filename)
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
