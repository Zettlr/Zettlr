/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrRendererIPC class
* CVM-Role:        Controller
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     Handles communication with the main process. There are
*                  three channels that are used for communication:
*                  - message: The default channel for most of the stuff (async)
*
* END HEADER
*/

const { trans } = require('../common/i18n.js')
const { clipboard } = require('electron')
const ipc = require('electron').ipcRenderer

// The following commands are sent from the renderer and can potentially close
// the current file. In that case we have to save the file first and then send
// the actual command.
const CLOSING_COMMANDS = [
  'file-get',
  'file-new',
  'file-delete',
  'file-rename', // No visible closing, but files are being swapped under the hood
  'close-root',
  'force-open',
  'win-close',
  'app-quit',
  'export' // Doesn't force-close, but this way the export is ensured to be the newest version
]

/**
* This class is the interface between the renderer and main process on the
* renderer side. It acts exactly like the ZettlrIPC class, only that it is
* instantiated and referenced to from the renderer process, and not the main.
* Therefore, mainly the events being handled differ.
*/
class ZettlrRendererIPC {
  /**
  * Initialize the communications Array
  * @param {ZettlrRenderer} parent The renderer object.
  */
  constructor (zettlrObj) {
    this._app = zettlrObj
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

      this._app.getEditor().saveFiles() // Save all files just in case
      return
    }

    ipc.send('message', {
      'command': command,
      'content': arg
    })
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
        this.send('print', { 'hash': this._app.getActiveFile().hash })
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

      // TODO: What the heck is that a kind of "name"?
      case 'dir-find':
      // User wants to search in current directory.
        this._app.getToolbar().focusSearch()
        break

      case 'workspace-open':
      // User has requested to open another folder. Notify host process.
        this.send('workspace-open')
        break

      case 'root-file-open':
        // User wants to open a new root file
        this.send('root-file-open')
        break

      // The user wants to open a dir externally (= in finder etc)
      case 'dir-open-externally':
        require('electron').shell.openPath(this._app.findObject(parseInt(cnt.hash, 10)).path)
          .then(potentialError => {
            if (potentialError !== '') {
              console.error('Could not open attachment:' + potentialError)
            }
          })
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

      // Copy the current file's ID to the clipboard
      case 'copy-current-id':
        try {
          require('electron').clipboard.writeText(this._app.getActiveFile().id)
        } catch (e) {
          // Obviously no ID ...
        }
        break

      // Closes a root file or directory
      case 'root-close':
        this.send('root-close', cnt.hash)
        break

        // FILES

      case 'file-request-sync':
        // Indicate with "true" that it should open the file in background
        this._app.openFile(cnt, true)
        break
      case 'file-open':
        this._app.openFile(cnt)
        break

      case 'announce-transient-file':
        global.editor.announceTransientFile(cnt.hash)
        break

      case 'file-close':
        this._app.closeFile(cnt.hash)
        break

      case 'file-close-all':
        this.send('file-close-all')
        break

      case 'file-save':
        this._app.getEditor().saveFiles(true) // true means only save active file
        break

      // Replace all properties of a file (e.g. on rename)
      case 'file-replace':
        this._app.replaceFile(cnt.hash, cnt.file)
        break

      // Is used to hot-swap the contents of a currently opened file
      case 'replace-file-contents':
        this._app.getEditor().replaceFileContents(cnt.hash, cnt.contents)
        break

      case 'sync-files':
        this._app.getEditor().syncFiles(cnt)
        break

        // case 'file-request-sync':
        //   // NOTE: We're now perfoming the same action as file-open
        //   // This is the answer from main with a file and its contents which
        //   // we simply need to add to the open files
        //   this._app.getEditor().addFileToOpen(cnt)
        //   break

      // Replace a full directory tree (e.g., on rename or modification of the children)
      case 'dir-replace':
        this._app.replaceDir(cnt.hash, cnt.dir)
        break

      // Show the popup to set a file's target
      case 'set-target':
        this._app.getBody().setTarget(cnt)
        break

      case 'mark-clean':
        this._app.getEditor().markClean(cnt.hash)
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
          this.send('file-delete', { 'hash': this._app.getActiveFile().hash })
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

      case 'toggle-typewriter-mode':
        this._app.getEditor().toggleTypewriterMode()
        break

      case 'toggle-file-manager':
        this._app.getFileManager().toggleFileList()
        break

      case 'export':
        if (this._app.getActiveFile() != null) {
          this._app.getBody().displayExport(this._app.getActiveFile())
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

      case 'toc':
        this._app.getBody().displayTOC()
        break

      // Pomodoro timer toggle
      case 'pomodoro':
        this._app.getPomodoro().popup()
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

      // About dialog
      case 'display-about':
        this._app.getBody().displayAbout()
        break

      case 'select-icon':
        this._app.getBody().displayIconSelect(cnt)
        break

      case 'toggle-sidebar':
        this._app.toggleSidebar()
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

      /**
       * TAB FUNCTIONALITY
       */
      case 'attempt-close-tab':
        // First, attempt to close a tab. If this function returns false, this
        // means there are no open tabs, so we can safely close the window.
        if (!this._app.getEditor().attemptCloseTab()) this.send('win-close')
        break

      case 'select-next-tab':
        this._app.getEditor().selectNextTab()
        break

      case 'select-previous-tab':
        this._app.getEditor().selectPrevTab()
        break

      default:
        console.log(trans('system.unknown_command', cmd))
        break
    }
  }
}

module.exports = ZettlrRendererIPC
