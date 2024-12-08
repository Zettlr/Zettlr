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
  shell,
  type FileFilter,
  type MessageBoxOptions
} from 'electron'
import EventEmitter from 'events'
import path from 'path'
import createMainWindow from './create-main-window'
import createPrintWindow from './create-print-window'
import createUpdateWindow from './create-update-window'
import createLogWindow from './create-log-window'
import createStatsWindow from './create-stats-window'
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
import type { WindowPosition } from './types'
import askFileDialog from './dialog/ask-file'
import saveFileDialog from './dialog/save-dialog'
import * as bcp47 from 'bcp-47'
import mapFSError from './map-fs-error'
import ProviderContract, { type IPCAPI } from '@providers/provider-contract'
import type LogProvider from '@providers/log'
import type DocumentManager from '@providers/documents'
import { DP_EVENTS } from '@dts/common/documents'
import { trans } from '@common/i18n-main'
import type ConfigProvider from '@providers/config'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import { getCLIArgument, LAUNCH_MINIMIZED } from '@providers/cli-provider'
import type { PasteModalResult } from '../commands/save-image-from-clipboard'

export interface RequestFilesIPCAPI {
  filters: FileFilter[],
  multiSelection: boolean
}

export type WindowControlsIPCAPI = IPCAPI<{
  'win-maximise': unknown
  'get-maximised-status': unknown
  'win-minimise': unknown
  'win-close': unknown
  'get-traffic-lights-rtl': unknown
  'cut': unknown
  'copy': unknown
  'paste': unknown
  'selectAll': unknown
  'inspect-element': { x: number, y: number }
  'drag-start': { filePath: string }
  'show-item-in-folder': { itemPath: string }
}>

export default class WindowProvider extends ProviderContract {
  private readonly _mainWindows: Record<string, BrowserWindow>
  private _printWindow: BrowserWindow|null
  private _updateWindow: BrowserWindow|null
  private _logWindow: BrowserWindow|null
  private _statsWindow: BrowserWindow|null
  private _assetsWindow: BrowserWindow|null
  private readonly _projectProperties: Map<string, BrowserWindow>
  private _preferences: BrowserWindow|null
  private _aboutWindow: BrowserWindow|null
  private _tagManager: BrowserWindow|null
  private _pasteImageModal: BrowserWindow|null
  private _errorModal: BrowserWindow|null
  private _printWindowFile: string|undefined
  private _windowState: Map<string, WindowPosition>
  private readonly _configFile: string
  private readonly _stateContainer: PersistentDataContainer<Record<string, WindowPosition>>
  private readonly _hasRTLLocale: boolean
  private suppressWindowOpening: boolean
  private readonly _emitter: EventEmitter
  private readonly _lastMainWindow: { windowId: string|undefined }

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _documents: DocumentManager
  ) {
    super()
    this._emitter = new EventEmitter()
    this._mainWindows = {}
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
    this._projectProperties = new Map()
    this._windowState = new Map()
    this._configFile = path.join(app.getPath('userData'), 'window_state.yml')
    this._stateContainer = new PersistentDataContainer(this._configFile, 'yaml', 1000)
    this._lastMainWindow = { windowId: undefined }

    // If the corresponding CLI flag is passed, we should suppress opening of
    // any windows until the user has manually activated the app by utilizing
    // the tray menu.
    this.suppressWindowOpening = getCLIArgument(LAUNCH_MINIMIZED) === true

    // Detect whether we have an RTL locale for correct traffic light positions.
    const schema = bcp47.parse(app.getLocale())

    /**
     * List of RTL languages, taken from https://ask.libreoffice.org/en/question/250893/
     */
    const LTR_SCRIPTS = [
      'ar', 'he', 'yi', 'ur', 'fa', 'ks', 'sd', 'ug',
      'ky', 'nqo', 'ckb', 'sdh', 'ku', 'hu', 'ms'
    ]

    if (schema.language != null && LTR_SCRIPTS.includes(schema.language)) {
      this._hasRTLLocale = true
    } else {
      this._hasRTLLocale = false
    }

    // Listen to window control commands
    ipcMain.on('window-controls', (event, message: WindowControlsIPCAPI) => {
      const callingWindow = BrowserWindow.fromWebContents(event.sender)
      if (callingWindow === null) {
        return
      }

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
          event.sender.inspectElement(Math.round(payload.x), Math.round(payload.y))
          break
        case 'drag-start':
          app.getFileIcon(payload.filePath)
            .then((icon) => {
              event.sender.startDrag({ file: payload.filePath, icon })
            })
            .catch(err => this._logger.error(`[Window Manager] Could not fetch icon for path ${String(payload.filePath)}`, err))
          break
        case 'show-item-in-folder':
          let { itemPath } = payload
          if (itemPath.startsWith('safe-file://')) {
            itemPath = itemPath.replace('safe-file://', '')
          } else if (itemPath.startsWith('file://')) {
            itemPath = itemPath.replace('file://', '')
          }

          // Due to the colons in the drive letters on Windows, the pathname will
          // look like this: /C:/Users/Documents/test.jpg
          // See: https://github.com/Zettlr/Zettlr/issues/5489
          if (/^\/[A-Z]:/i.test(itemPath)) {
            itemPath = itemPath.slice(1)
          }

          shell.showItemInFolder(decodeURIComponent(itemPath))
          break
      }
    })

    /**
     * Handle incoming requests for files (on the operating system). This request
     * can be made by any renderer process. The window manager will prompt the
     * user for files corresponding to the given filters, and then return a list
     * of those selected.
     */
    ipcMain.handle('request-files', async (event, message: RequestFilesIPCAPI) => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      // The client only can choose what and how much it wants to get
      return await this.askFile(
        message.filters,
        message.multiSelection,
        focusedWindow
      )
    })

    ipcMain.handle('request-dir', async (event, _message) => {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      return await this.askDir(trans('Open project folder'), focusedWindow)
    })

    this._documents.on(DP_EVENTS.CHANGE_FILE_STATUS, (_ctx: any) => {
      // Always update the main window's flag depending on whether the document
      // manager is clean or not
      for (const key in this._mainWindows) {
        this.setModified(key, !this._documents.isClean(key, 'window'))
      }
    })

    this._documents.on(DP_EVENTS.NEW_WINDOW, () => {
      this.syncMainWindows()
    })

    this._documents.on(DP_EVENTS.WINDOW_CLOSED, ({ windowId }) => {
      const win = this._mainWindows[windowId]
      if (win !== undefined) {
        win.close()
      }
    })
  }

  /**
   * Programmatically closes all main windows that are open.
   */
  closeMainWindows (): void {
    for (const key in this._mainWindows) {
      this._mainWindows[key].close()
    }
  }

  /**
   * Boots up the window manager and shows the main window, if applicable
   */
  async boot (): Promise<void> {
    this._logger.verbose('Window manager booting up ...')

    // Immediately begin loading the data
    if (!await this._stateContainer.isInitialized()) {
      await this._stateContainer.init(Object.fromEntries(this._windowState))
    }
    const tmpObject = await this._stateContainer.get()
    this._windowState = new Map()
    for (const [ key, value ] of Object.entries(tmpObject)) {
      if (value !== undefined) {
        this._windowState.set(key, value)
      }
    }
    this._logger.info('[Window Manager] Window Manager started.')
  }

  /**
   * This function gets called from the AppServiceContainer after boot. It
   * should begin opening the main windows, if applicable.
   */
  public maybeShowWindows (): void {
    const traySupported = process.env.ZETTLR_IS_TRAY_SUPPORTED === '1'
    if (!this.suppressWindowOpening || !traySupported) {
      this.suppressWindowOpening = false
      this.syncMainWindows()
    } else {
      this._logger.info('[Window Manager] Application should start in tray. Not showing main window.')
    }
  }

  /**
   * Listens to events emitted by the WindowManager
   *
   * @param   {string}    evt       The event to listen to
   * @param   {Function}  callback  The callback to call
   */
  on (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.on(evt, callback)
  }

  /**
   * Removes the specified callback for the specified event
   *
   * @param   {string}    evt       The event to listen to
   * @param   {Function}  callback  The callback to call
   */
  off (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.off(evt, callback)
  }

  /**
   * Shuts down the window manager and performs final operations
   */
  async shutdown (): Promise<void> {
    this._stateContainer.shutdown()
  }

  /**
   * Listens to events on the main window
   */
  private _hookMainWindow (window: BrowserWindow): void {
    // Listens to events from the window
    window.on('focus', () => {
      const key = this.getMainWindowKey(window)
      if (key !== undefined) {
        this._lastMainWindow.windowId = key
      }
    })

    window.on('close', (event) => {
      const key = this.getMainWindowKey(window)

      if (key === undefined) {
        this._logger.error('[Window Manager] A main window is being closed, but I could not find its key!')
        return
      }

      const nWindows = Object.values(this._mainWindows).length // BrowserWindow.getAllWindows().length
      const leaveAppRunning = this._config.get().system.leaveAppRunning

      // If this is the last window open on Windows or Linux, the user intention
      // is to quit the app. To prevent the document manager from removing the
      // window from the config, we need to programmatically issue a quit event.
      // If the user has explicitly mentioned that they want to keep the app
      // running, we will only close the window here, but don't tell the
      // documents manager about it so that it keeps the document in the config.
      if (nWindows === 1 && process.platform !== 'darwin') {
        if (!leaveAppRunning) {
          app.quit()
        } else {
          window.close()
        }
        return
      }

      // Only close this window if it is safe to do so. The isClean() method will
      // return true during shutdowns.
      if (!this._documents.isClean(key)) {
        event.preventDefault()
        this._documents.askUserToCloseWindow(key)
          .then(canCloseWindow => {
            if (canCloseWindow) {
              window.close()
            }
          })
          .catch(err => {
            this._logger.error('[WindowManager] Could not ask user to close window', err)
          })
      } else {
        this._documents.closeWindow(key)
      }
    })

    window.on('closed', () => {
      // The window has been closed -> dereference
      const key = this.getMainWindowKey(window)
      if (key === undefined) {
        this._logger.error('[Window Manager] Could not dereference a main window since its key was not found!')
        return
      } else {
        if (this._lastMainWindow.windowId === key) {
          this._lastMainWindow.windowId = undefined
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete this._mainWindows[key]
    })
  }

  /**
   * Returns the associated key for the provided window. Returns undefined if it
   * is not a main window
   *
   * @param   {BrowserWindow}  win  The window
   *
   * @return  {string}              The key
   */
  public getMainWindowKey (win: BrowserWindow): string|undefined {
    for (const key in this._mainWindows) {
      if (win === this._mainWindows[key]) {
        return key
      }
    }
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
    this._stateContainer.set(Object.fromEntries(this._windowState))
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
    const existingPosition = this._windowState.get(stateId)
    if (existingPosition === undefined) {
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
      this._updateWindowPosition(stateId, existingPosition) // Sanitize the position
    }

    // At this point we will definitely have a WindowPosition for this window.
    return this._windowState.get(stateId)!
  }

  /**
   * Takes a WindowPosition and sets it for the window identified by stateId, after
   * sanitizing the window position correctly.
   *
   * @param   {string}          stateId   The unique stateId of the window, not to be confused with Electron's window ID.
   * @param   {WindowPosition}  position  The window position to be set.
   */
  private _updateWindowPosition (stateId: string, position: WindowPosition): void {
    // First a fallback display
    let { id, workArea } = screen.getPrimaryDisplay()

    // Then try to find the correct display
    const allDisplays = screen.getAllDisplays()
    for (const display of allDisplays) {
      if (display.id === position.lastDisplayId) {
        // Wonderful
        id = display.id
        workArea = display.workArea
        break
      }
    }

    position.lastDisplayId = id

    // Make sure that all bounds are still good to go
    if (position.width > workArea.width) {
      position.width = workArea.width
    }

    if (position.height > workArea.height) {
      position.height = workArea.height
    }

    const positionRight = position.x + position.width
    const positionBottom = position.y + position.height
    const workAreaRight = workArea.x + workArea.width
    const workAreaBottom = workArea.y + workArea.height

    if (position.x < workArea.x) {
      position.x = workArea.x
    }

    if (position.y < workArea.y) {
      position.y = workArea.y
    }

    if (positionRight > workAreaRight) {
      position.x -= positionRight - workAreaRight
    }

    if (positionBottom > workAreaBottom) {
      position.y -= positionBottom - workAreaBottom
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
   * This function gets called from the tray provider to signal to the window
   * provider that the user is ready to "activate" the app. Only gets called
   * once per program run.
   */
  public activateFromTray (): void {
    this.suppressWindowOpening = false
    this.syncMainWindows() // Ensure all main windows are there
    this.showAnyWindow() // Ensure at least one window is actually visible
  }

  /**
   * Synchronizes the open main windows with the documents manager.
   */
  private syncMainWindows (): void {
    if (this.suppressWindowOpening) {
      this._logger.info('[Window Manager] Received request to synchronize windows, but the app is still in tray mode.')
      return
    }

    // Remove main windows that are no longer in the document manager
    const documentKeys = this._documents.windowKeys()
    for (const key in this._mainWindows) {
      if (!documentKeys.includes(key)) {
        this._mainWindows[key].close()
      }
    }

    for (const key of documentKeys) {
      if (key in this._mainWindows) {
        this._makeVisible(this._mainWindows[key])
        continue
      }

      const stateId = `main-${key}`

      // Then deal with all windows that are not yet visible
      const { workArea } = screen.getPrimaryDisplay()
      const windowConfiguration = this._retrieveWindowPosition(stateId, {
        y: workArea.y,
        x: workArea.x,
        width: workArea.width,
        height: workArea.height
      })

      const win = createMainWindow(key, this._logger, this._config, this._documents, windowConfiguration)
      this._hookMainWindow(win)
      this._hookWindowResize(win, stateId)
      this._mainWindows[key] = win
    }

    if (this._documents.windowCount() === 0) {
      // There must be always at least one window
      this._documents.newWindow()
    }
  }

  /**
   * Shows any window. If none are open, the main window will be opened and
   * shown. NOTE: If `suppressWindowOpening` is true, it will not show windows.
   */
  showAnyWindow (): void {
    if (BrowserWindow.getFocusedWindow() !== null) {
      return // We already have a focused window
    }

    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) {
      this.syncMainWindows()
    } else {
      this._makeVisible(windows[0])
    }
  }

  /**
   * Returns the first existing main window. This function will return the
   * focused window, if that happens to be a main window, otherwise the first
   * main window that is open.
   *
   * @return  {BrowserWindow|undefined}  The window, or undefined
   */
  getFirstMainWindow (): BrowserWindow|undefined {
    if (this._lastMainWindow.windowId !== undefined) {
      const window = this._mainWindows[this._lastMainWindow.windowId]
      if (window !== undefined) {
        return window
      }
    }

    const allWindows = BrowserWindow.getAllWindows()
    for (const win of allWindows) {
      if (this.getMainWindowKey(win) !== undefined) {
        return win
      }
    }
  }

  /**
   * Displays the log window
   */
  showLogWindow (): void {
    if (this._logWindow === null) {
      const conf = this._retrieveWindowPosition('log', null)
      this._logWindow = createLogWindow(this._logger, this._config, conf)
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
   *
   * @param  {string}  preselectTab  Whether to preselect one of the tabs; this
   *                                 is effectively the URL hash fragment.
   */
  showDefaultsWindow (preselectTab?: string): void {
    if (this._assetsWindow === null) {
      const conf = this._retrieveWindowPosition('assets', null)
      this._assetsWindow = createAssetsWindow(this._logger, this._config, conf, preselectTab)
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
      this._statsWindow = createStatsWindow(this._logger, this._config, conf)
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
      this._preferences = createPreferencesWindow(this._logger, this._config, conf)
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
      this._aboutWindow = createAboutWindow(this._logger, this._config, conf)
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
      this._tagManager = createTagManagerWindow(this._logger, this._config, conf)
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
  async showPasteImageModal (startPath: string): Promise<PasteModalResult|undefined> {
    return await new Promise((resolve, reject) => {
      const firstMainWin = this.getFirstMainWindow()
      if (firstMainWin === undefined) {
        return reject(new Error('[Window Manager] A paste image modal was requested, but there was no main window open.'))
      }
      this._pasteImageModal = createPasteImageModal(this._logger, this._config, firstMainWin, startPath)

      let hasResolved = false
      ipcMain.once('paste-image-ready', (event, data: PasteModalResult) => {
        // Resolve now
        resolve(data)
        hasResolved = true
        this._pasteImageModal?.close()
      })

      // Dereference the modal as soon as it is closed.
      this._pasteImageModal.on('closed', () => {
        ipcMain.removeAllListeners('paste-image-ready') // Not to have a dangling listener hanging around
        if (!hasResolved) {
          resolve(undefined) // Resolve with undefined to indicate that the user has aborted
        }
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
    const firstMainWin = this.getFirstMainWindow()
    if (firstMainWin === undefined) {
      this._logger.error('[Application] Could not display error message, because the main window was not open!', message)
      return
    }

    if (this._errorModal !== null) {
      this._errorModal.close()
      // Dereference
      this._errorModal = null
    }

    this._errorModal = createErrorModal(this._logger, this._config, firstMainWin, title, message, contents)

    // Dereference the window as soon as it is closed
    this._errorModal.on('closed', () => {
      this._errorModal = null
    })
  }

  /**
   * Reports an error specific to reading or writing files and directories.
   *
   * @param   {string}  title  A title for the error prompt (e.g. Error opening Workspace)
   * @param   {any}     error  The error object that should be reported. Should be thrown by fs
   */
  reportFSError (title: string, error: any): void {
    const { what, why } = mapFSError(error)
    this.showErrorMessage(title, `There was an error accessing "${what}"`, why)
  }

  /**
   * Opens the print window with the given file
   *
   * @param   {string}  filePath  The file to load
   */
  showPrintWindow (filePath: string): void {
    if (this._printWindow === null) {
      const conf = this._retrieveWindowPosition('print', null)
      this._printWindow = createPrintWindow(this._logger, this._config, filePath, conf)
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
    const existingWindow = this._projectProperties.get(dirPath)
    if (existingWindow === undefined) {
      const conf = this._retrieveWindowPosition('project-properties', null)
      const newWindow = createProjectPropertiesWindow(this._logger, this._config, conf, dirPath)
      this._projectProperties.set(dirPath, newWindow)
      this._hookWindowResize(newWindow, 'project-properties')

      // Dereference the window as soon as it is closed
      newWindow.on('closed', () => {
        this._projectProperties.delete(dirPath)
      })
    } else {
      this._makeVisible(existingWindow)
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
      this._updateWindow = createUpdateWindow(this._logger, this._config, conf)
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
  setModified (windowId: string, modificationState: boolean): void {
    if (windowId in this._mainWindows && process.platform === 'darwin') {
      this._mainWindows[windowId].setDocumentEdited(modificationState)
    }
  }

  // ######################### DIALOG BOXES ####################################

  /**
   * Asks the user for confirmation whether to replace an opened file with a
   * newer version.
   *
   * @param {string}   filename The filename to be displayed.
   * @return {boolean} True if the file should be replaced
   */
  async shouldReplaceFile (filePath: string): Promise<boolean> {
    const firstMainWin = this.getFirstMainWindow()
    if (firstMainWin === undefined) {
      // If the main window is not open, there is no sense in showing this
      // box, as the file is not really "open". It will be shown once a new
      // main window is opened, but then the file contents will be loaded from
      // disk either way.
      return true
    }

    const filename = path.basename(filePath)

    return await shouldReplaceFileDialog(this._config, firstMainWin, filename)
  }

  /**
    * Ask whether or not the user wants to replace a certain file.
    * @param   {string} filename The filename that should be contained in the message
    * @return  {boolean}         Resolves with true if the file should be overwritten
    */
  async shouldOverwriteFile (filename: string): Promise<boolean> {
    const firstMainWin = this.getFirstMainWindow()
    if (firstMainWin === undefined) {
      return false
    }

    return await shouldOverwriteFileDialog(firstMainWin, filename)
  }

  /**
   * Asks the user whether or not to persist or drop changes to their files. It
   * returns the ID of the clicked button in the message box, which is 0 to
   * simply drop changes, 1 to abort closing in order to save.
   *
   * @return  {Promise<any>}  Returns the message box results
   */
  async askSaveChanges (): Promise<Electron.MessageBoxReturnValue> {
    const firstMainWin = this.getFirstMainWindow()
    if (firstMainWin === undefined) {
      throw new Error('Could not ask to save changes: No main window was open!')
    }
    return await askSaveChanges(firstMainWin)
  }

  /**
    * Show the dialog for choosing a directory
    * @return {string[]} An array containing all selected paths.
    */
  async askDir (title: string, win?: BrowserWindow|null, buttonLabel?: string, message?: string): Promise<string[]> {
    if (win != null) {
      return await askDirectoryDialog(this._config, win, title, buttonLabel, message)
    } else {
      const firstMainWin = this.getFirstMainWindow()
      if (firstMainWin === undefined) {
        throw new Error('Could not ask user for directory: No main window open!')
      }
      return await askDirectoryDialog(this._config, firstMainWin, title, buttonLabel, message)
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
      return await askFileDialog(this._config, win, filters, multiSel)
    } else {
      const firstMainWin = this.getFirstMainWindow()
      if (firstMainWin === undefined) {
        throw new Error('Could not ask user for file: No main window open!')
      }
      return await askFileDialog(this._config, firstMainWin, filters, multiSel)
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
      return await saveFileDialog(this._logger, this._config, win, fileOrPathName)
    } else {
      const firstMainWin = this.getFirstMainWindow()
      if (firstMainWin === undefined) {
        throw new Error('Could not ask user to save: No main window open!')
      }
      return await saveFileDialog(this._logger, this._config, firstMainWin, fileOrPathName)
    }
  }

  /**
    * This function prompts the user with information.
    * @param  {any} options Necessary information for displaying the prompt
    */
  prompt (options: Partial<MessageBoxOptions> & { message: string }|string): void {
    const firstMainWin = this.getFirstMainWindow()
    if (firstMainWin === undefined) {
      return
    }
    promptDialog(this._logger, firstMainWin, options)
  }
}
