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
  BrowserWindow,
  dialog,
  ipcMain,
  FileFilter,
  OpenDialogOptions,
  OpenDialogReturnValue,
  MessageBoxOptions,
  MessageBoxReturnValue
} from 'electron'
import path from 'path'
import { trans } from '../../../common/lang/i18n'
import isDir from '../../../common/util/is-dir'
import { DirDescriptor, MDFileDescriptor } from '../fsal/types'
import createMainWindow from './create-main-window'
import createPrintWindow from './create-print-window'
import createQuicklookWindow from './create-ql-window'

interface QuicklookRecord {
  path: string
  win: BrowserWindow
}

export default class WindowManager {
  private _mainWindow: BrowserWindow|null
  private readonly _qlWindows: QuicklookRecord[]
  private _printWindow: BrowserWindow|null
  private _printWindowFile: string|undefined

  constructor () {
    this._mainWindow = null
    this._qlWindows = []
    this._printWindow = null
    this._printWindowFile = undefined

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
          event.reply('window-controls', {
            command: 'win-size-changed',
            payload: callingWindow.isMaximized()
          })
          break
        case 'win-minimise':
          callingWindow.minimize()
          break
        case 'win-close':
          callingWindow.close()
          break
        case 'get-maximised-status':
          event.reply('window-controls', {
            command: 'get-maximised-status',
            payload: callingWindow.isMaximized()
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
   * Shows the main window
   */
  showMainWindow (): void {
    if (this._mainWindow === null) {
      // Instantiate ...
      this._mainWindow = createMainWindow()
      this._hookMainWindow()
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
      // This particular file is not yet open -> open it
      const window: BrowserWindow = createQuicklookWindow(file)
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

    let options: MessageBoxOptions = {
      type: 'question',
      title: trans('system.replace_file_title'),
      message: trans('system.replace_file_message', filename),
      checkboxLabel: trans('dialog.preferences.always_reload_files'),
      checkboxChecked: global.config.get('alwaysReloadFiles'),
      buttons: [
        trans('system.cancel'),
        trans('system.ok')
      ],
      cancelId: 0,
      defaultId: 1
    }

    // Asynchronous message box to not block the main process
    let response = await dialog.showMessageBox(this._mainWindow, options)

    global.config.set('alwaysReloadFiles', response.checkboxChecked)

    return response.response === 1
  }

  /**
    * Ask whether or not the user wants to replace a certain file.
    * @param   {string} filename The filename that should be contained in the message
    * @return  {boolean}         Resolves with true if the file should be overwritten
    */
  async askOverwriteFile (filename: string): Promise<boolean> {
    let options = {
      type: 'question',
      title: trans('system.overwrite_file_title'),
      message: trans('system.overwrite_file_message', filename),
      buttons: [
        trans('system.cancel'),
        trans('system.ok')
      ],
      cancelId: 0,
      defaultId: 1
    }

    // showMessageBox returns a Promise, resolves to:
    let response: MessageBoxReturnValue
    if (this._mainWindow !== null) {
      response = await dialog.showMessageBox(this._mainWindow, options)
    } else {
      response = await dialog.showMessageBox(options)
    }

    return (response.response === 1)
  }

  /**
    * Show the dialog for choosing a directory
    * @return {string[]} An array containing all selected paths.
    */
  async askDir (): Promise<string[]> {
    let startDir = app.getPath('home')

    if (isDir(global.config.get('dialogPaths.askDirDialog'))) {
      startDir = global.config.get('dialogPaths.askDirDialog')
    }

    const options: OpenDialogOptions = {
      title: trans('system.open_folder'),
      defaultPath: startDir,
      properties: [
        'openDirectory',
        'createDirectory' // macOS only
      ]
    }

    let response: OpenDialogReturnValue
    if (this._mainWindow !== null) {
      response = await dialog.showOpenDialog(this._mainWindow, options)
    } else {
      response = await dialog.showOpenDialog(options)
    }

    // Save the path of the dir into the config
    if (!response.canceled && response.filePaths.length > 0) {
      global.config.set('dialogPaths.askDirDialog', response.filePaths[0])
    }

    if (response.canceled) {
      return []
    } else {
      return response.filePaths
    }
  }

  /**
   * Shows the dialog for importing files from the disk.
   *
   * @param  {FileFilter[]|null}  [filters=null]    An array of extension filters.
   * @param  {boolean}            [multiSel=false]  Determines if multiple files are allowed
   * @param  {string}             [startDir]        The starting directory
   *
   * @return {string[]}                             An array containing all selected files.
   */
  async askFile (
    filters: FileFilter[]|null = null,
    multiSel: boolean = false,
    startDir: string = global.config.get('dialogPaths.askFileDialog')
  ): Promise<string[]> {
    // Sanity check for default start directory.
    if (!isDir(startDir)) {
      startDir = app.getPath('documents')
    }

    // Fallback filter: All files
    if (filters === null) {
      filters = [{
        name: trans('system.all_files'),
        extensions: ['*']
      }]
    }

    // Prepare options
    let opt: OpenDialogOptions = {
      title: trans('system.open_file'),
      defaultPath: startDir,
      properties: ['openFile'],
      filters: filters
    }

    // Should multiple selections be allowed?
    if (multiSel) {
      (opt.properties as string[]).push('multiSelections')
    }

    let response: OpenDialogReturnValue
    if (this._mainWindow !== null) {
      response = await dialog.showOpenDialog(this._mainWindow, opt)
    } else {
      response = await dialog.showOpenDialog(opt)
    }

    // Save the path of the containing dir of the first file into the config
    if (!response.canceled && response.filePaths.length > 0) {
      global.config.set('dialogPaths.askFileDialog', path.dirname(response.filePaths[0]))
    }

    // Return an empty array if the dialog was cancelled
    if (response.canceled) {
      return []
    } else {
      return response.filePaths
    }
  }

  /**
    * This function prompts the user with information.
    * @param  {any} options Necessary informations for displaying the prompt
    */
  prompt (options: any): void {
    if (typeof options === 'string') {
      options = { 'message': options }
    }

    const boxOptions: MessageBoxOptions = {
      type: 'info',
      buttons: ['Ok'],
      defaultId: 0,
      title: 'Zettlr',
      message: options.message
    }

    if (options.type !== undefined) {
      boxOptions.type = options.type as string
    }

    if (options.title !== undefined) {
      boxOptions.title = options.title as string
    }

    // The showmessageBox-function returns a promise,
    // nevertheless, we don't need a return.
    if (this._mainWindow !== null) {
      dialog.showMessageBox(this._mainWindow, options)
        .catch(e => global.log.error('[Window Manager] Prompt threw an error', e))
    } else {
      dialog.showMessageBox(options)
        .catch(e => global.log.error('[Window Manager] Prompt threw an error', e))
    }
  }

  /**
    * Ask to remove the associated path for the descriptor
    * @param  {MDFileDescriptor|DirDescriptor} descriptor The corresponding descriptor
    * @return {boolean}                                   True if user wishes to remove it.
    */
  async confirmRemove (descriptor: MDFileDescriptor|DirDescriptor): Promise<boolean> {
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
