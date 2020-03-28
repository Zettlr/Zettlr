/**
* @ignore
* BEGIN HEADER
*
* Contains:        GettlrRendererIPC class
* CVM-Role:        Controller
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     Handles communication with the main process. There are
*                  three channels that are used for communication:
*                  - message: The default channel for most of the stuff (async)
*                  - config: Retrieve configuration values (sync)
*                  - typo: Retrieve dictionary functions (sync)
*
* END HEADER
*/

const { trans } = require('../common/lang/i18n.js')
const { clipboard } = require('electron')
const ipc = require('electron').ipcRenderer

// The following commands are sent from the renderer and can potentially close
// the current file. In that case we have to save the file first and then send
// the actual command.
const CLOSING_COMMANDS = [
  'file-get',
  'file-new',
  'file-delete',
  'close-root',
  'force-open',
  'win-close',
  'app-quit',
  'export' // Doesn't force-close, but this way the export is ensured to be the newest version
]

/**
* This class is the interface between the renderer and main process on the
* renderer side. It acts exactly like the GettlrIPC class, only that it is
* instantiated and referenced to from the renderer process, and not the main.
* Therefore, mainly the events being handled differ.
*/
class GettlrRendererIPC {
  /**
  * Initialize the communications Array
  * @param {GettlrRenderer} parent The renderer object.
  */
  constructor (GettlrObj) {
    this._app = GettlrObj
    ipc.on('message', (event, arg) => {
      // Do we have an asynchronous callback?
      if (arg.hasOwnProperty('cypher') && arg.cypher !== '') {
        // Find the callback, call it and remove it from the buffer.
        if (this._callbackBuffer[arg.cypher]) {
          this._callbackBuffer[arg.cypher](arg.returnValue)
          this._callbackBuffer[arg.cypher] = undefined
          return
        }
      }

      // Now check if there are any once-callbacks listed
      for (let cb of this._onceCallbacks) {
        if (cb.message === arg.command) {
          // Call the callback and remove from the array
          cb.callback(arg.content)
          this._onceCallbacks.splice(this._onceCallbacks.indexOf(cb), 1)
          return
        }
      }

      // Dispatch the message further down the array.
      this.dispatch(arg)
    })

    this._bufferedMessage = null
    this._callbackBuffer = {}
    this._onceCallbacks = []

    // This is an object that will hold all previously checked words in the form
    // of word: correct?
    // We are explicitly omitting the prototype stuff, as we don't access this.
    this._invalidateDictionaryBuffer()
    this._typoCheck = false
    // Activate typocheck after 2 seconds to speed up the app's start
    setTimeout(() => { this._typoCheck = true }, 2000)

    // What we are doing here is setting up a special communications channel
    // with the main process to receive config values. This way it is much
    // easier to access the configuration from throughout the whole renderer
    // process.
    global.config = {
      get: (key) => {
        if (typeof key !== 'string') {
          console.error('Cannot request config value - key was not a string.')
          return undefined // On error return undefined
        }
        // We will send a synchronous event to the main process in order to
        // immediately receive the config value we need. Basically we are pulling
        // the get()-handler from main using the "remote" feature, but we'll
        // implement it ourselves.
        return ipc.sendSync('config', key)
      }
    }

    // Inject typo spellcheck and suggest functions into the globals
    global.typo = {
      check: (term) => {
        if (!this._typoCheck) return true // Give the dictionaries some time to heat up
        // Return cache if possible
        if (this._typoCache[term] !== undefined) return this._typoCache[term]
        // Save into the corresponding cache and return the query result
        // Return the query result
        let correct = ipc.sendSync('typo', { 'type': 'check', 'term': term })
        if (correct === 'not-ready') return true // Don't check unless its ready
        this._typoCache[term] = correct
        return correct
      },
      suggest: (term) => {
        return ipc.sendSync('typo', { 'type': 'suggest', 'term': term })
      }
    }

    // Sends an array of IDs to main. If they are found in the JSON, cool! Otherwise
    // this will return false.
    global.citeproc = {
      getCitation: (citation) => {
        return ipc.sendSync('cite', {
          'type': 'get-citation',
          'content': citation
        })
      },
      updateItems: (keyList) => {
        return ipc.sendSync('cite', {
          'type': 'update-items',
          'content': keyList
        })
      },
      makeBibliography: () => { ipc.send('cite', { 'type': 'make-bibliography' }) }
    }

    global.ipc = {
      /**
       * Sends a message and and saves the callback.
       * @param  {string} cmd             The command to be sent
       * @param  {Object} [cnt={}]        The payload for the command
       * @param  {Callable} [callback=null] An optional callback
       * @return {void}                 This function does not return.
       */
      send: (cmd, cnt = {}, callback = null) => {
        // If no callback was provided we don't need to go through the hassle of
        // generating and saving a cypher, but we can instead just send the
        // message to main.
        if (!callback) return this.send(cmd, cnt)

        // A number between 0 and 50.000 should suffice for a unique key to
        // find the callback when the return comes from main.
        let cypher
        do {
          cypher = Math.round(Math.random() * 50000).toString()
        } while (this._callbackBuffer[cypher])
        // Prepare the payload
        let payload = {
          'command': cmd,
          'content': cnt,
          'cypher': cypher
        }
        // Save the callback for later
        this._callbackBuffer[cypher] = callback
        // Send!
        ipc.send('message', payload)
      },
      /**
       * Registers a callback for a one-time message callback.
       * @param  {String}   message  The message to which this callback applies
       * @param  {Function} callback The provided callback
       * @return {void}            Does not return.
       */
      once: (message, callback) => {
        this._onceCallbacks.push({
          'message': message,
          'callback': callback
        })
      }
    }
  }

  /**
  * Dispatch a command to the parent
  * @param  {Object} arg   The message body
  * @return {void}       Nothing to return.
  */
  dispatch (arg) {
    // handleEvent expects arg to contain at least 'command' and 'content'
    // properties
    if (!arg.hasOwnProperty('command')) {
      console.error(trans('system.no_command', arg))
      return
    }
    if (!arg.hasOwnProperty('content')) {
      arg.content = {}
    }
    this.handleEvent(arg.command, arg.content)
  }

  /**
  * Wrapper for ipc send
  * @param  {String} command The command to send
  * @param  {Mixed} [arg={}] Additional content for the command
  * @return {void}         Nothing to return.
  */
  send (command, arg = {}) {
    if (CLOSING_COMMANDS.includes(command) && this._app.isModified()) {
      // Buffer the command for later and send a save command
      this._bufferedMessage = {
        'command': command,
        'content': arg
      }

      this._app.saveFile()
      return
    }

    ipc.send('message', {
      'command': command,
      'content': arg
    })
  }

  /**
   * Invalidates the complete dictionary buffer. Necessary to retrieve accurate
   * messages whenever the dictionaries change during runtime.
   * @return {void} Does not return.
   */
  _invalidateDictionaryBuffer () {
    this._typoCache = Object.create(null)
  }

  /**
  * Switch over the received message.
  * @param {String} cmd The command
  * @param  {Object} cnt   The message's body
  * @return {void}       Nothing to return.
  * @deprecated Will be moved to Renderer-IPC in another version
  */
  handleEvent (cmd, cnt) {
    switch (cmd) {
      // The main process can request the renderer to retrieve another file
      case 'file-get':
        this.send(cmd, cnt)
        break

      // This message is sent by the main process and directs the renderer to
      // flush the complete dictionary buffer so that message are being fetched
      // from main again.
      case 'invalidate-dict':
        this._invalidateDictionaryBuffer()
        break

      case 'app-quit':
        // In this case we simply "re-send" that command. This will internally
        // trigger a closing-command buffer, which saves the file before actually
        // sending the quit command. The quit command is then used by the main
        // IPC to quit the app.
        this.send('app-quit')
        break

      case 'win-close':
        // In this case we simply "re-send" that command. As above, this will
        // internally trigger a closing-command buffer, saving the file before
        // actually sending the quit command.
        this.send('win-close')
        break

      // Tell main to open the menu
      case 'win-menu':
        this.send('win-menu', cnt)
        break

      // Print the current file
      case 'print':
        this.send('print')
        break

      // The context menu triggers this action, so send it to the main process.
      case 'open-quicklook':
        this.send('open-quicklook', cnt)
        break

      case 'paths-update':
        // Update the paths
        this._app.refresh(cnt)
        break

      // A "minor" update which is send on saving the current file
      // Saves resources and prevents the app to feel laggy.
      case 'file-update':
        this._app.refreshCurrentFile(cnt)
        break

      // DIRECTORIES
      case 'dir-set-current':
      // Received a new directory
        this._app.setCurrentDir(cnt)
        break

      case 'dir-find':
      // User wants to search in current directory.
        this._app.getToolbar().focusSearch()
        break

      case 'dir-open':
      // User has requested to open another folder. Notify host process.
        this.send('dir-open')
        break

      case 'dir-rename':
        this._app.renameDir(cnt)
        break

      case 'dir-new':
        this._app.newDir(cnt)
        break

      case 'dir-delete':
        this._app.deleteDir(cnt)
        break

      case 'dir-new-vd':
        this._app.newVirtualDir(cnt)
        break

      // Make a project from a directory
      case 'dir-new-project':
        this.send('dir-new-project', cnt)
        break

      // Unmake the project
      case 'dir-remove-project':
        this.send('dir-remove-project', cnt)
        break

      case 'dir-project-properties':
        this.send('dir-project-properties', cnt)
        break

      case 'project-properties':
        this._app.getBody().displayProjectProperties(cnt)
        break

      case 'dir-project-export':
        this.send('dir-project-export', cnt)
        break

      // Emanates from the context menu, so simply send it to main
      case 'dir-rescan':
        this.send(cmd, cnt)
        break

      // Closes a root file or directory
      case 'root-close':
        this.send('root-close', cnt.hash)
        break

        // FILES

      case 'file-set-current':
        this._app.setCurrentFile(cnt)
        break

      case 'file-open':
        this._app.openFile(cnt)
        break

      case 'file-close':
        this._app.closeFile()
        break

      case 'file-save':
        this._app.saveFile()
        break

      // Replace all properties of a file (e.g. on rename)
      case 'file-replace':
        this._app.replaceFile(cnt.hash, cnt.file)
        break

      // Replace a full directory tree (e.g., on rename or modification of the children)
      case 'dir-replace':
        this._app.replaceDir(cnt.hash, cnt.dir)
        break

      // Show the popup to set a file's target
      case 'set-target':
        this._app.getBody().setTarget(cnt)
        break

      case 'mark-clean':
        this._app.getEditor().markClean()
        // If we have a buffered message, send that and afterwards clean up
        if (this._bufferedMessage != null) {
          this.send(this._bufferedMessage.command, this._bufferedMessage.content)
          this._bufferedMessage = null
        }
        break

      case 'file-rename':
        this._app.renameFile(cnt)
        break

      case 'file-new':
        this._app.newFile(cnt)
        break

      case 'file-find':
        this._app.getBody().displayFind()
        break

      case 'file-duplicate':
        this._app.getBody().requestDuplicate(cnt)
        break

      case 'file-delete':
        // The user has requested to delete the current file
        // Request from main process
        if (cnt.hasOwnProperty('hash')) {
          this.send('file-delete', { 'hash': cnt.hash })
        } else {
          this.send('file-delete', {})
        }
        break

      // Toggle theme or file meta, main will automatically trigger a configuration change.
      case 'toggle-theme':
        this.send('toggle-theme') // Notify host process for configuration save
        break

      case 'toggle-file-meta':
        this.send('toggle-file-meta')
        break

      case 'toggle-distraction-free':
        this._app.getEditor().toggleDistractionFree()
        this._app.getToolbar().toggleDistractionFree()
        break

      case 'toggle-sidebar':
        this._app.getSidebar().toggleFileList()
        break

      case 'export':
        if (this._app.getCurrentFile() != null) {
          this._app.getBody().displayExport(this._app.getCurrentFile())
        }
        break

      // An update in the config needs to be reflected in the renderer.
      case 'config-update':
        this._app.configChange()
        break

      case 'open-preferences':
        this.send('get-preferences')
        break

      case 'open-pdf-preferences':
        this.send('get-pdf-preferences')
        break

      case 'open-tags-preferences':
        this.send('get-tags-preferences')
        break

      case 'open-custom-css':
        this._app.getBody().displayCustomCss()
        break

      case 'preferences':
        this._app.getBody().displayPreferences(cnt)
        break

      case 'pdf-preferences':
        this._app.getBody().displayPDFPreferences(cnt)
        break

      case 'tags-preferences':
        this._app.getBody().displayTagsPreferences(cnt)
        break

      case 'inspect-clipboard':
        this._app.getBody().displayDevClipboard()
        break

      case 'set-tags':
        global.store.set('tags', cnt)
        break

      // Update the editor's tag database
      case 'tags-database':
        this._app.getEditor().setTagDatabase(cnt)
        break

      // Display the informative tag cloud
      case 'show-tag-cloud':
        this._app.getBody().displayTagCloud()
        break

      // Execute a command with CodeMirror (Bold, Italic, Link, etc)
      case 'cm-command':
        this._app.getEditor().runCommand(cnt)
        // After a codemirror command has been issued through this function
        // give the editor back focus
        this._app.getEditor().focus()
        break

      // Show the format option table
      case 'formatting':
        this._app.getBody().displayFormatting()
        break

      // Toggle the editor's readability-mode on or off.
      case 'toggle-readability':
        this._app.getEditor().toggleReadability()
        break

      // Small notification
      case 'notify':
        global.notify(cnt)
        break

      // Dedicated dialog window for the error
      case 'notify-error':
        global.notifyError(cnt)
        break

      case 'toc':
        this._app.getBody().displayTOC()
        break

      // Zoom
      case 'zoom-reset':
        this._app.getEditor().zoom(0) // <-- Sometimes I think I am stupid. Well, but it works, I guess.
        break
      case 'zoom-in':
        this._app.getEditor().zoom(1)
        break
      case 'zoom-out':
        this._app.getEditor().zoom(-1)
        break

      // Updater
      case 'update-check':
        this.send('update-check')
        break

      case 'update-available':
        this._app.getBody().displayUpdate(cnt)
        break

      // About dialog
      case 'display-about':
        this._app.getBody().displayAbout()
        break

      case 'toggle-attachments':
        this._app.toggleAttachments()
        break

      // Stats
      case 'show-stats':
        this.send('request-stats-data')
        break

      case 'stats-data':
        this._app.getBody().displayStats(cnt)
        break

      // Generate a new ID
      case 'insert-id':
        this._app.genId()
        break

      // Insert arbitrary text into the CodeMirror instance
      case 'insert-text':
        this._app.getEditor().insertText(cnt)
        break

      // Import a language file
      case 'import-lang-file':
        this.send('import-lang-file')
        break

      // Import files and folders
      case 'import-files':
        this.send('import-files')
        break

      case 'show-in-finder':
        this._app.showInFinder(cnt)
        break

      // Copy a selection as HTML
      case 'copy-as-html':
        this._app.getEditor().copyAsHTML()
        break

      // Paste the current clipboard selection as plain text
      case 'paste-as-plain':
        this._app.getEditor().pasteAsPlain()
        break

      // Return to the app a fresh list of IDs available.
      case 'citeproc-ids':
        this._app.setCiteprocIDs(cnt.ids)
        break

      // The argument contains a new bibliography object
      case 'citeproc-bibliography':
        this._app.setBibliography(cnt)
        break

      case 'copy-to-clipboard':
        // Simply copy the content to the clipboard as text
        clipboard.writeText(cnt)
        break

      case 'paste-image':
        // An image has been pasted onto the editor. Show the dialog to
        // determine what to do.
        this._app.getBody().displayPasteImage()
        break

      default:
        console.log(trans('system.unknown_command', cmd))
        break
    }
  }
}

module.exports = GettlrRendererIPC
