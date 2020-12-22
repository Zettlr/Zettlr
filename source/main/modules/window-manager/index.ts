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
  dialog,
  ipcMain,
  FileFilter,
  MessageBoxOptions,
  MessageBoxReturnValue
} from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { trans } from '../../../common/i18n'
import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '../fsal/types'
import createMainWindow from './create-main-window'
import createPrintWindow from './create-print-window'
import createQuicklookWindow from './create-ql-window'
import shouldOverwriteFileDialog from './dialog/should-overwrite-file'
import shouldReplaceFileDialog from './dialog/should-replace-file'
import askDirectoryDialog from './dialog/ask-directory'
import promptDialog from './dialog/prompt'
import sanitizeWindowPosition from './sanitize-window-position'
import { WindowPosition } from './types.d'
import askFileDialog from './dialog/ask-file'

interface QuicklookRecord {
  path: string
  win: BrowserWindow
}

export default class WindowManager {
  private _mainWindow: BrowserWindow|null
  private readonly _qlWindows: QuicklookRecord[]
  private _printWindow: BrowserWindow|null
  private _printWindowFile: string|undefined
  private _windowState: WindowPosition[]
  private readonly _configFile: string
  private _fileLock: boolean
  private _persistTimeout: ReturnType<typeof setTimeout>|undefined

  constructor () {
    this._mainWindow = null
    this._qlWindows = []
    this._printWindow = null
    this._printWindowFile = undefined
    this._windowState = []
    this._configFile = path.join(app.getPath('userData'), 'window_state.json')
    this._fileLock = false

    // Listen to window control commands
    ipcMain.on('window-controls', (event, message) => {
      const callingWindow = BrowserWindow.fromWebContents(event.sender)

      if (callingWindow === null) return

      const { command, payload } = message

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
      }
    })

    /**
     * Handle incoming requests for files (on the operating system). This request
     * can be made by any renderer process. The window manager will prompt the
     * user for files corresponding to the given filters, and then return a list
     * of those selected.
     */
    ipcMain.handle('request-files', async (event, message) => {
      // The client only can choose what and how much it wants to get
      let files = await this.askFile(message.filters, message.multiSelection)
      return files
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
        if (win === this._mainWindow) continue

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
        } else {
          global.log.warning(`[Window Manager] The window "${win.getTitle()}" (ID: ${win.id}) is not managed by the window manager.`)
          win.close()
        }
      }

      // TODO: Check if we can really close the window. Abort using
      // event.preventDefault() if necessary.
    }) // END: mainWindow.on(close)

    this._mainWindow.on('closed', () => {
      // The window has been closed -> dereference
      this._mainWindow = null
    })
  }

  /**
   * Makes a BrowserWindow visible and focuses it.
   *
   * @param   {BrowserWindow}  win  The window to make visible
   */
  private _makeVisible (win: BrowserWindow): void {
    if (win.isMinimized()) {
      // Maximise and move on top
      win.maximize()
      win.moveTop()
    } else if (!win.isVisible()) {
      // Show and move to top
      win.show()
      win.moveTop()
    }

    // Afterwards, in any case: focus the window
    win.focus()
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
      this._persistTimeout = setTimeout(() => { this._persistWindowPositions() }, 1000)
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
    window.on('resize', callback)
    window.on('move', callback)
  }

  /**
   * Shows the main window
   */
  showMainWindow (): void {
    if (this._mainWindow === null) {
      // Instantiate a new main window
      let windowConfiguration = this._windowState.find(state => {
        return state.windowType === 'main'
      })

      if (windowConfiguration === undefined) {
        // Pass a default configuration
        const display = screen.getPrimaryDisplay()
        windowConfiguration = {
          windowType: 'main',
          top: display.workArea.y,
          left: display.workArea.x,
          width: display.workArea.width,
          height: display.workArea.height,
          isMaximised: true,
          lastDisplayId: display.id
        }

        this._windowState.push(windowConfiguration)
      }

      const saneConfiguration = sanitizeWindowPosition(windowConfiguration)
      // Exchange the sanitised configuration
      this._windowState.splice(this._windowState.indexOf(windowConfiguration), 1, saneConfiguration)

      this._mainWindow = createMainWindow(saneConfiguration)
      this._hookMainWindow()
      this._hookWindowResize(this._mainWindow, saneConfiguration)
    } else {
      this._makeVisible(this._mainWindow)
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
      let windowConfiguration = this._windowState.find(state => {
        return state.windowType === 'quicklook' &&
        state.quicklookFile === file.path
      })

      if (windowConfiguration === undefined) {
        // Pass a default configuration
        const display = screen.getPrimaryDisplay()
        const width = Math.min(display.workArea.width, display.workArea.width / 2)
        const height = Math.min(display.workArea.height, display.workArea.height / 2)
        const top = (display.workArea.height - height) / 2
        const left = (display.workArea.width - width) / 2
        windowConfiguration = {
          windowType: 'quicklook',
          quicklookFile: file.path,
          top: display.workArea.y + top, // Some displays begin at a y > 0
          left: display.workArea.x + left, // Same as with the y-value
          width: width,
          height: height,
          isMaximised: false,
          lastDisplayId: display.id
        }

        this._windowState.push(windowConfiguration)
      }

      const saneConfiguration = sanitizeWindowPosition(windowConfiguration)
      // Exchange the sanitised configuration
      this._windowState.splice(this._windowState.indexOf(windowConfiguration), 1, saneConfiguration)

      // This particular file is not yet open -> open it
      const window: BrowserWindow = createQuicklookWindow(file, saneConfiguration)
      this._hookWindowResize(window, saneConfiguration)
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

  showLogWindow (): void {
    // Shows the log window TODO
  }

  /**
   * Opens the print window with the given file
   *
   * @param   {string}  filePath  The file to load
   */
  showPrintWindow (filePath: string): void {
    // Shows the print window
    if (this._printWindow === null) {
      this._printWindow = createPrintWindow(filePath)
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
   * @return  {BrowserWindow}  The main window
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
  async askReplaceFile (filename: string): Promise<boolean> {
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
  async askOverwriteFile (filename: string): Promise<boolean> {
    return await shouldOverwriteFileDialog(this._mainWindow, filename)
  }

  /**
    * Show the dialog for choosing a directory
    * @return {string[]} An array containing all selected paths.
    */
  async askDir (): Promise<string[]> {
    return await askDirectoryDialog(this._mainWindow)
  }

  /**
   * Shows the dialog for importing files from the disk.
   *
   * @param  {FileFilter[]|null}  [filters=null]    An array of extension filters.
   * @param  {boolean}            [multiSel=false]  Determines if multiple files are allowed
   *
   * @return {string[]}                             An array containing all selected files.
   */
  async askFile (filters: FileFilter[]|null = null, multiSel: boolean = false): Promise<string[]> {
    return await askFileDialog(this._mainWindow, filters, multiSel)
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
    const options: MessageBoxOptions = {
      type: 'warning',
      buttons: [ 'Ok', trans('system.error.cancel_remove') ],
      defaultId: 0,
      cancelId: 1,
      title: trans('system.error.remove_title'),
      message: trans('system.error.remove_message', descriptor.name)
    }

    let response: MessageBoxReturnValue
    if (this._mainWindow !== null) {
      response = await dialog.showMessageBox(this._mainWindow, options)
    } else {
      response = await dialog.showMessageBox(options)
    }

    // 0 = Ok, 1 = Cancel
    return (response.response === 0)
  }
}
