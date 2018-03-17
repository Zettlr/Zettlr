/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrRendererIPC class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Handles communication with the main process.
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

/**
 * This class is the interface between the renderer and main process on the
 * renderer side. It acts exactly like the ZettlrIPC class, only that it is
 * instantiated and referenced to from the renderer process, and not the main.
 * Therefore, mainly the events being handled differ.
 */
class ZettlrRendererIPC
{
    /**
     * Initialize the communications Array
     * @param {ZettlrRenderer} parent The renderer object.
     */
    constructor(zettlrObj)
    {
        this._app = zettlrObj;
        this._ipc = require("electron").ipcRenderer;
        this._ipc.on('message', (event, arg) => {
            // Omit the event immediately
            this.dispatch(arg);
        });
    }

    /**
     * Dispatch a command to the parent
     * @param  {Object} arg   The message body
     * @return {void}       Nothing to return.
     */
    dispatch(arg)
    {
        // handleEvent expects arg to contain at least 'command' and 'content'
        // properties
        if(!arg.hasOwnProperty('command')) {
            console.error(trans('system.no_command', arg));
            return;
        }
        if(!arg.hasOwnProperty('content')) {
            arg.content = {};
        }
        this.handleEvent(arg.command, arg.content);
    }

    /**
     * Wrapper for ipc send
     * @param  {String} command The command to send
     * @param  {Mixed} [arg={}] Additional content for the command
     * @return {void}         Nothing to return.
     */
    send(command, arg = {})
    {
        this._ipc.send('message', {
            'command': command,
            'content': arg
        });
    }

    /**
     * Switch over the received message.
     * @param {String} cmd The command
     * @param  {Object} cnt   The message's body
     * @return {void}       Nothing to return.
     * @deprecated Will be moved to Renderer-IPC in another version
     */
    handleEvent(cmd, cnt)
    {
        switch(cmd)
        {
            case 'paths':
            // arg contains a JSON with all paths and files
            // Initial command.
            this._app.newProject(cnt);
            break;

            case 'paths-update':
            // Update the paths
            this._app.refresh(cnt);
            break;

            // DIRECTORIES
            case 'dir-set-current':
            // Received a new directory
            this._app.setCurrentDir(cnt);
            break;

            case 'dir-find':
            // User wants to search in current directory.
            this._app.getToolbar().focusSearch();
            break;

            case 'dir-open':
            // User has requested to open another folder. Notify host process.
            this.send('dir-open', {});
            break;

            case 'dir-rename':
            this._app.renameDir(cnt);
            break;

            case 'dir-new':
            this._app.newDir(cnt);
            break;

            case 'dir-delete':
            this._app.deleteDir(cnt);
            break;

            // FILES

            case 'file-set-current':
            this._app.setCurrentFile(cnt);
            break;

            case 'file-open':
            this._app.openFile(cnt);
            break;

            case 'file-close':
            this._app.closeFile();
            break;

            case 'file-save':
            this._app.saveFile();
            break;

            case 'mark-clean':
            this._app.getEditor().markClean();
            break;

            case 'file-request-revert':
            this.send('file-revert');
            break;

            case 'file-revert':
            this._app.getEditor().revert(cnt);
            break;

            case 'file-rename':
            this._app.renameFile(cnt);
            break;

            case 'file-new':
            this._app.newFile(cnt);
            break;

            case 'file-find':
            this._app.getEditor().openFind();
            break;

            case 'file-insert':
            // DEPRECATED
            this._app.getPreview().refresh();
            break;

            case 'file-delete':
            // The user has requested to delete the current file
            // Request from main process
            if(cnt.hasOwnProperty('hash')) {
                this.send('file-delete', { 'hash': cnt.hash });
            } else {
                this.send('file-delete', {});
            }
            break;

            case 'file-search-result':
            this._app.getPreview().handleSearchResult(cnt);
            break;

            case 'toggle-theme':
            this._app.toggleTheme();
            if(cnt !== 'no-emit') {
                this.send('toggle-theme'); // Notify host process for configuration save
            }
            break;

            case 'toggle-snippets':
            this._app.getPreview().toggleSnippets();
            if(cnt !== 'no-emit') {
                this.send('toggle-snippets');
            }
            break;

            case 'toggle-directories':
            this._app.toggleDirectories();
            break;

            case 'toggle-preview':
            this._app.getEditor().togglePreview();
            break;

            case 'export':
            if(this._app.getCurrentFile() != null) {
                this._app.getBody().displayExport(this._app.getCurrentFile());
            }
            break;

            case 'open-preferences':
            this.send('get-preferences', {});
            break;

            case 'preferences':
            this._app.getBody().displayPreferences(cnt);
            break;

            // Execute a command with CodeMirror (Bold, Italic, Link, etc)
            case 'cm-command':
            this._app.getEditor().runCommand(cnt);
            // After a codemirror command has been issued through this function
            // give the editor back focus
            this._app.getEditor().cm.focus();
            break;

            case 'config':
            switch(cnt.key)
            {
                case 'darkTheme':
                // Will only be received once, so simply "toggle" from initial
                // light theme to dark
                if(cnt.value == true) {
                    this._app.toggleTheme();
                }
                break;
                case 'snippets':
                // Will only be received once; if false toggle from initial "true"
                // state.
                if(!cnt.value) {
                    this._app.getPreview().toggleSnippets();
                }
                break;
                case 'app_lang':
                this._app.lang = cnt.value;
                break;
                case 'pandoc':
                this._app.pandoc = cnt.value;
                break;
                case 'pdflatex':
                this._app.pdflatex = cnt.value;
                break;
                case 'autosave':
                this._app.autosave_enabled = cnt.value;
                break;
            }
            break;

            // SPELLCHECKING EVENTS
            case 'typo-lang':
            // arg.content contains an object holding trues and falses for all
            // languages to be checked simultaneously
            this._app.setSpellcheck(cnt);
            // Also pass down the languages to the body so that it can display
            // them in the preferences dialog
            this._app.getBody().setSpellcheckLangs(cnt);
            break;

            // Receive the typo aff!
            case 'typo-aff':
            this._app.typoAff = cnt;
            this._app.requestLang('dic');
            break;

            // Receive the typo dic!
            case 'typo-dic':
            this._app.typoDic = cnt;
            // Now we can finally initialize spell check:
            this._app.initTypo();
            break;

            case 'quicklook':
            this.send('file-get-quicklook', cnt.hash);
            break;

            case 'file-quicklook':
            this._app.getBody().quicklook(cnt);
            break;

            case 'notify':
            this._app.getBody().notify(cnt);
            break;

            case 'toc':
            this._app.toc();
            break;

            // Pomodoro timer toggle
            case 'pomodoro':
            this._app.getPomodoro().popup();
            break;

            // Zoom
            case 'zoom-reset':
            this._app.getEditor().zoom(0); // <-- Sometimes I think I am stupid. Well, but it works, I guess.
            break;
            case 'zoom-in':
            this._app.getEditor().zoom(1);
            break;
            case 'zoom-out':
            this._app.getEditor().zoom(-1);
            break;

            // Updater
            case 'update-check':
            this.send('update-check');
            break;

            case 'update-available':
            this._app.getBody().displayUpdate(cnt);
            break;

            default:
            console.log(trans('system.unknown_command', cmd));
            break;
        }
    }
}

module.exports = ZettlrRendererIPC;
