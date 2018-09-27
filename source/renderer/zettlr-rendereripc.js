/* global $ */

/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrRendererIPC class
* CVM-Role:        Controller
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     Handles communication with the main process.
*
* END HEADER
*/

const { trans } = require('../common/lang/i18n.js')

// The following commands are sent from the renderer and can potentially close
// the current file. In that case we have to save the file first and then send
// the actual command.
const CLOSING_COMMANDS = [
  'file-get',
  'file-new',
  'file-delete',
  'close-root',
  'force-open',
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
    this._ipc = require('electron').ipcRenderer
    this._ipc.on('message', (event, arg) => {
      // Omit the event immediately
      this.dispatch(arg)
    })

    this._bufferedMessage = null

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
        return this._ipc.sendSync('config', key)
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

    this._ipc.send('message', {
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
      case 'app-quit':
        // In this case we simply "re-send" that command. This will internally
        // trigger a closing-command buffer, which saves the file before actually
        // sending the quit command. The quit command is then used by the main
        // IPC to quit the app.
        this.send('app-quit')
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

      case 'root-close':
        this.send('close-root', cnt.hash)
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

      case 'file-delete':
        // The user has requested to delete the current file
        // Request from main process
        if (cnt.hasOwnProperty('hash')) {
          this.send('file-delete', { 'hash': cnt.hash })
        } else {
          this.send('file-delete', {})
        }
        break

      case 'file-delete-from-vd':
        if (cnt.hasOwnProperty('hash') && cnt.hasOwnProperty('virtualdir')) {
          this.send('file-delete-from-vd', cnt)
        }
        break

      case 'file-search-result':
        this._app.getPreview().handleSearchResult(cnt)
        break

      case 'toggle-theme':
        this._app.toggleTheme()
        if (cnt !== 'no-emit') {
          this.send('toggle-theme') // Notify host process for configuration save
        }
        break

      case 'toggle-snippets':
        this._app.getPreview().toggleSnippets()
        if (cnt !== 'no-emit') {
          this.send('toggle-snippets')
        }
        break

      case 'toggle-distraction-free':
        this._app.getEditor().toggleDistractionFree()
        this._app.getToolbar().toggleDistractionFree()
        break

      case 'toggle-directories':
        if (this._app.getDirectories().isHidden()) {
          this._app.showDirectories()
        } else {
          this._app.showPreview()
        }
        break

      case 'toggle-preview':
        if (this._app.getPreview().isHidden()) {
          this._app.showPreview()
        } else {
          this._app.showDirectories()
        }
        break

      case 'export':
        if (this._app.getCurrentFile() != null) {
          this._app.getBody().displayExport(this._app.getCurrentFile())
        }
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

      case 'preferences':
        this._app.getBody().displayPreferences(cnt)
        break

      case 'pdf-preferences':
        this._app.getBody().displayPDFPreferences(cnt)
        break

      case 'tags-preferences':
        this._app.getBody().displayTagsPreferences(cnt)
        break

      case 'set-tags':
        this._app.getPreview().setTags(cnt)
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

      // SPELLCHECKING EVENTS
      case 'typo-lang':
        // cnt holds an array of all languages that should be initialised.
        this._app.setSpellcheck(cnt)
        // Also pass down the languages to the body so that it can display
        // them in the preferences dialog
        this._app.getBody().setSpellcheckLangs(cnt)
        break

      // Receive the typo aff!
      case 'typo-aff':
        this._app.setAff(cnt)
        this._app.requestLang('dic')
        break

      // Receive the typo dic!
      case 'typo-dic':
        this._app.setDic(cnt)
        // Now we can finally initialize spell check:
        this._app.initTypo()
        break

      case 'quicklook':
        this.send('file-get-quicklook', cnt.hash)
        break

      case 'file-quicklook':
        this._app.getBody().quicklook(cnt)
        break

      case 'notify':
        this._app.getBody().notify(cnt)
        break

      case 'toc':
        this._app.toc()
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
        this._app.getStatsView().show(cnt)
        break

      // Recent documents
      case 'show-docs':
        this._app.getBody().showRecentDocuments()
        break

      // Generate a new ID
      case 'insert-id':
        this._app.getEditor().insertId()
        break

      // Import a language file
      case 'import-lang-file':
        this.send('import-lang-file')
        break

      // Import files and folders
      case 'import-files':
        this.send('import-files')
        break

      // Copy a selection as HTML
      case 'copy-as-html':
        this._app.getEditor().copyAsHTML()
        break

      default:
        console.log(trans('system.unknown_command', cmd))
        break
    }
  }
}

module.exports = ZettlrRendererIPC
