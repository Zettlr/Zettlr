/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrIPC class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is basically the postmaster of the app. There are
 *                  three channels that are used for communication:
 *                  - message: The default channel for most of the stuff (async)
 *                  - config: Retrieve configuration values (sync)
 *                  - typo: Retrieve dictionary functions (sync)
 *
 * END HEADER
 */

const { trans, getTranslationMetadata } = require('../common/lang/i18n.js')
const ipc = require('electron').ipcMain
const { BrowserWindow } = require('electron') // Needed for close and maximise commands

/**
 * This class acts as the interface between the main process and the renderer.
 * It receives messages from the renderer and dispatches them to their appropriate
 * addressees, as well as send commands after a small sanity check (such that
 * the content is never empty)
 */
class ZettlrIPC {
  /**
    * Create the ipc
    * @param {Zettlr} zettlrObj The application main object
    */
  constructor (zettlrObj) {
    this._app = zettlrObj

    // Listen to window commands
    ipc.on('window-controls', (event, command) => {
      const callingWindow = BrowserWindow.fromWebContents(event.sender)

      if (callingWindow === null) return

      console.log('Command received ' + command)

      switch (command) {
        // Window controls actions can be send either as callback IPC calls or as
        // normals (which is why they are present both in runCall and handleEvent)
        case 'win-maximise':
          if (callingWindow.isMaximized()) {
            callingWindow.unmaximize()
          } else {
            callingWindow.maximize()
          }
          event.sender.send('window-controls', {
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
          event.sender.send('window-controls', {
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
      }
    })

    // Beginn listening to messages
    ipc.on('message', (event, arg) => {
      // We always need a command
      if (!arg.hasOwnProperty('command')) {
        global.log.error(trans('system.no_command'), arg)
        return
      }

      if (arg.command === 'file-drag-start') {
        event.sender.startDrag({
          'file': this._app.findFile(arg.content.hash).path,
          'icon': require('path').join(__dirname, '/assets/dragicon.png')
        })
        return // Don't dispatch further
      }

      // Next possibility: An asynchronous callback from the renderer.
      if (arg.hasOwnProperty('cypher') && arg.cypher !== '') {
        // In this case we have to run whatever is wanted and immediately return
        // (Don't let yourselves be fooled by how I named this argument. This is
        // only to confuse myself in some months when I will stumble back upon
        // this piece of code and wonder why I have to send/return the thing
        // twice.)
        this.runCall(arg.command, arg.content).then((retVal) => {
          arg.returnValue = retVal
          event.sender.send('message', arg)
        })
        return // Also, don't dispatch further
      }

      // Last possibility: A quicklook window has requested a file. In this case
      // we mustn't obliterate the "event" because this way we don't need to
      // search for the window.
      if (arg.command === 'ql-get-file') {
        let QLFile = this._app.findFile(arg.content)
        global.application.getFile(QLFile).then(file => {
          event.sender.send('file', file)
        })
        return
      }

      // In all other occasions omit the event.
      this.dispatch(arg)
    })

    // Enable some globals for sending to the renderer
    global.ipc = {
      /**
       * Sends an arbitrary message to the renderer.
       * @param  {String} cmd The command to be sent
       * @param  {Object} arg An optional object with data.
       * @return {void}     Does not return.
       */
      send: (cmd, arg) => { this.send(cmd, arg) },
      /**
       * Sends a message to the renderer and displays it as a notification.
       * @param  {String} msg The message to be sent.
       * @return {void}       Does not return.
       */
      notify: (msg) => { this.send('notify', msg) },
      /**
       * Sends an error to the renderer process that should be displayed using
       * a dedicated dialog window (is used, e.g., during export when Pandoc
       * throws potentially a lot of useful information for fixing problems in
       * the source files).
       * @param  {Object} msg        The error object
       * @return {void}            Does not return.
       */
      notifyError: (msg) => { this.send('notify-error', msg) }
    }
  }

  /**
    * This function gets called every time the renderer sends a message.
    * @param  {Object} arg   The message's body
    * @return {void}       Does not return anything.
    */
  dispatch (arg) {
    // handleEvent expects arg to contain at least 'command' and 'content'
    // properties. That 'command' exists is checked by the message handler
    if (!arg.hasOwnProperty('content')) arg.content = {}
    this.handleEvent(arg.command, arg.content)
  }

  /**
    * This sends a message to the current window's renderer process.
    * @param  {String} command      The command to be sent
    * @param  {any} [content={}] Can be either simply a string or a whole object
    * @return {ZettlrIPC}              This for chainability.
    */
  send (command, content = {}) {
    let focusedWindow = BrowserWindow.getFocusedWindow()
    let mainWinFocused = this._app.window.getWindow() === focusedWindow
    if (command === 'attempt-close-tab' && !mainWinFocused && focusedWindow) {
      // DEBUG attention, monkey-patch
      focusedWindow.close()
      return this
    }

    if (!this._app.window.getWindow()) return this
    let sender = this._app.window.getWindow().webContents
    sender.webContents.send('message', {
      'command': command,
      'content': content
    })

    return this
  }

  /**
    * This function switches through the received command and issues function
    * calls to the zettlr object according to the events.
    * @param {String} cmd The command to be handled
    * @param  {Object} cnt   Contains the message body.
    * @return {void}       Does not return anything.
    */
  async handleEvent (cmd, cnt) {
    // We received a new event and need to handle it.
    try {
      global.log.verbose('Trying to run command through Application: ' + cmd)
      let res = await this._app.runCommand(cmd, cnt)
      return res // In case the command has run there's no need to handle it.
    } catch (e) {
      // Simple fall through
      if (e.message.indexOf('No command registered with the application') < 0) console.error(e)
    }

    switch (cmd) {
      case 'app-quit':
        // This command is sent by the renderer once the user requested to quit
        // the app. This way it is ensured that the "save before quit?"-message
        // only shows in rare cases where the file cannot be saved.
        require('electron').app.quit()
        break

      // Window controls for the Quicklook windows must use IPC calls
      case 'win-maximise':
        if (BrowserWindow.getFocusedWindow()) {
          // Implements maximise-toggling for windows
          if (BrowserWindow.getFocusedWindow().isMaximized()) {
            BrowserWindow.getFocusedWindow().unmaximize()
          } else {
            BrowserWindow.getFocusedWindow().maximize()
          }
        }
        break

      case 'win-minimise':
        if (BrowserWindow.getFocusedWindow()) BrowserWindow.getFocusedWindow().minimize()
        break

      case 'win-close':
        if (BrowserWindow.getFocusedWindow()) BrowserWindow.getFocusedWindow().close()
        break

      // Also the application menu must be shown on request
      case 'win-menu':
        this._app.getWindow().popupMenu(cnt.x, cnt.y)
        break

      case 'get-paths':
        // The child process requested the current paths and files
        this._app.sendPaths()
        // Also set the current file and dir correctly immediately
        this.send('dir-set-current', (this._app.getCurrentDir()) ? this._app.getCurrentDir().hash : null)
        this._app.sendOpenFiles()
        break

      case 'file-get':
        // The client requested a different file.
        this._app.openFile(cnt)
        break

      case 'file-request-sync':
        // The editor has received a synchronisation command and now needs to
        // pull some additional files from the main process in order to have
        // their contents available.
        this._app.getFileSystem().getFileContents(this._app.getFileSystem().findFile(cnt.hash))
          .then(file => { this.send('file-request-sync', file) })
        break

      case 'dir-select':
        // The client requested another directory
        this._app.selectDir(cnt)
        break

      case 'file-modified':
        // Set the modification flag and notify the FSAL of a dirty doc.
        this._app.setModified(cnt.hash)
        break

      // Sent by the renderer to indicate the active file has changed
      case 'set-active-file':
        this._app.getFileSystem().activeFile = cnt.hash
        break

      // The renderer requested that the editor
      // is marked clean again
      case 'mark-clean':
        this._app.clearModified(cnt.hash)
        break

      // Set or update a target
      case 'set-target':
        global.targets.set(cnt)
        break

      case 'workspace-open':
        // Client requested a totally different folder.
        this._app.openWorkspace()
        break

      case 'root-file-open':
        // Client requested a new file.
        this._app.openRootFile()
        break

      // Change theme in config
      case 'toggle-theme':
        global.config.set('darkTheme', !global.config.get('darkTheme'))
        break

      // Change file meta setting in config
      case 'toggle-file-meta':
        global.config.set('fileMeta', !global.config.get('fileMeta'))
        break

      case 'get-pdf-preferences':
        // Get the same whole config object. ZettlrDialog will filter out
        // the PDF preferences. Why do we need the whole? Because the project
        // settings are a superset of PDF, so to save space, we'll re-use
        // their code, but to unify it we need these settings to access
        // obj.pdf instead of obj.
        this.send('pdf-preferences', global.config.get())
        break

      case 'get-tags-preferences':
        this.send('tags-preferences', global.tags.getSpecialTags())
        break

      // Got a new config object
      case 'update-config':
        global.config.bulkSet(cnt)
        break

      case 'update-tags':
        global.tags.update(cnt)
        // fall through
      case 'get-tags':
        this.send('set-tags', global.tags.getSpecialTags())
        break

      // Send the global tag database to the renderer process.
      case 'get-tags-database':
        this.send('tags-database', global.tags.getTagDatabase())
        break

      // Handle dropped files/folders
      case 'handle-drop':
        this._app.handleAddRoots(cnt)
        break

      // Statistics
      case 'request-stats-data':
        this.send('stats-data', this._app.getStats().getStats())
        break

      // Return a list of all available IDs in the currently loaded database
      case 'citeproc-get-ids':
        this.send('citeproc-ids', (global.citeproc) ? global.citeproc.getIDs() : [])
        break

      case 'open-quicklook':
        this._app.openQL(cnt)
        return true

      // Request a language to download from the API
      case 'request-language':
        global.translations.requestLanguage(cnt)
        break

      case 'switch-theme-berlin':
      case 'switch-theme-bielefeld':
      case 'switch-theme-frankfurt':
      case 'switch-theme-karl-marx-stadt':
      case 'switch-theme-bordeaux':
        // Set the theme accordingly
        global.config.set('display.theme', cmd.substr(13))
        break

      default:
        global.log.error(trans('system.unknown_command', cmd))
        break
    }
  }

  /**
   * Literally the same as dispatch(), only with returns
   * @param  {string} cmd The Command
   * @param  {Object} arg The payload
   * @return {Promise}    Returns a promise that resolves to the return value
   */
  async runCall (cmd, arg) {
    // We received a new event and need to handle it.

    switch (cmd) {
      // We should show the askFile dialog to the user and return its result.
      case 'request-files':
        // The client only can choose what and how much it wants to get
        return this._app.getWindow().askFile(arg.filters, arg.multiSel)

      // A quicklook window wants to pop-out of the main window
      case 'open-quicklook':
        this._app.openQL(arg)
        return true

      // Return the metadata for the translation files
      case 'get-translation-metadata':
        return getTranslationMetadata()

      // Send the global tag database to the renderer process.
      case 'get-tags-database':
        return global.tags.getTagDatabase()

      // Returns the custom CSS's file contents
      case 'get-custom-css':
        return global.css.get()

      // Updates the file contents
      case 'set-custom-css':
        console.log('setting custom css', arg)
        return global.css.set(arg)

      default:
        global.log.error(trans('system.unknown_command', cmd))
        return null
    }
  }
}

module.exports = ZettlrIPC
