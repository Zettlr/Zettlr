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

const { trans } = require('../common/i18n.js')
const ipc = require('electron').ipcMain

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
       * @deprecated
       */
      send: (cmd, arg) => { this.send(cmd, arg) }
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
    if (this._app.getMainWindow() === null) return this
    this._app.getMainWindow().webContents.send('message', {
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
      case 'get-pdf-preferences':
        // Get the same whole config object. ZettlrDialog will filter out
        // the PDF preferences. Why do we need the whole? Because the project
        // settings are a superset of PDF, so to save space, we'll re-use
        // their code, but to unify it we need these settings to access
        // obj.pdf instead of obj.
        this.send('pdf-preferences', global.config.get())
        break

      // Handle dropped files/folders
      case 'handle-drop':
        this._app.handleAddRoots(cnt)
        break

      case 'open-quicklook':
        this._app.openQL(cnt)
        return true

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
      // A quicklook window wants to pop-out of the main window
      case 'open-quicklook':
        this._app.openQL(arg)
        return true

      default:
        global.log.error(trans('system.unknown_command', cmd))
        return null
    }
  }
}

module.exports = ZettlrIPC
