/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrIPC class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is basically the postmaster of the app.
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

/**
 * This class acts as the interface between the main process and the renderer.
 * It receives messages from the renderer and dispatches them to their appropriate
 * addressees, as well as send commands after a small sanity check (such that
 * the content is never empty)
 */
class ZettlrIPC
{
    /**
     * Create the ipc
     * @param {Zettlr} zettlrObj The application main object
     */
    constructor(zettlrObj)
    {
        this._app = zettlrObj;
        this._ipc = require('electron').ipcMain;

        // Beginn listening to messages
        this._ipc.on('message', (event, arg) => {
            if(arg.hasOwnProperty('command') && arg.command == 'file-drag-start') {
                event.sender.startDrag({
                    'file': this._app.findFile(arg.content).path,
                    'icon': require('path').join(__dirname, '/assets/dragicon.png')
                });
                return; // Don't dispatch further
            }

            // In all other occasions omit the event.
            this.dispatch(arg);
        });
    }

    /**
     * This function gets called every time the renderer sends a message.
     * @param  {Object} arg   The message's body
     * @return {void}       Does not return anything.
     */
    dispatch(arg)
    {
        // handleEvent expects arg to contain at least 'command' and 'content'
        // properties
        if(!arg.hasOwnProperty('command')) {
            console.error(trans('system.no_command'), arg);
            return;
        }
        if(!arg.hasOwnProperty('content')) {
            arg.content = {};
        }
        this.handleEvent(arg.command, arg.content);
    }

    /**
     * This sends a message to the current window's renderer process.
     * @param  {String} command      The command to be sent
     * @param  {Object} [content={}] Can be either simply a string or a whole object
     * @return {ZettlrIPC}              This for chainability.
     */
    send(command, content = {})
    {
        if(!this._app.window.getWindow()) {
            return this; // Fail gracefully
        }

        let sender = this._app.window.getWindow().webContents;
        sender.send('message', {
            'command': command,
            'content': content
        });

        return this;
    }

    /**
     * This function switches through the received command and issues function
     * calls to the zettlr object according to the events.
     * @param {String} cmd The command to be handled
     * @param  {Object} cnt   Contains the message body.
     * @return {void}       Does not return anything.
     */
    handleEvent(cmd, cnt)
    {
        // We received a new event and need to handle it.

        // This class can handle some events by itself, because they don't involve
        // a lot of code and it saves space doing it here. Therefore we need some vars.
        let dir = null;

        switch(cmd) {
            case 'get-paths':
            // The child process requested the current paths and files
            this.send('paths-update', this._app.getPaths());
            break;

            case 'file-get-quicklook':
            this.send('file-quicklook', this._app.findFile({'hash': cnt}).withContent());
            break;

            case 'file-get':
            // The client requested a different file.
            this._app.sendFile(cnt);
            break;

            case 'dir-select':
            // The client requested another directory
            this._app.selectDir(cnt);
            break;

            case 'dir-sort':
            this._app.sortDir(cnt);
            break;

            case 'file-modified':
            // Just set the modification flags.
            this._app.setModified();
            break;

            case 'file-new':
            // Client has requested a new file.
            this._app.newFile(cnt);
            break;

            case 'dir-new':
            // Client has requested a new folder.
            this._app.newDir(cnt);
            break;

            case 'dir-new-vd':
            // Client has requested a new virtual directory
            this._app.newVirtualDir(cnt);
            break;

            // PROJECTS
            case 'dir-new-project':
            dir = this._app.findDir(cnt);
            if(dir) {
                dir.makeProject();
                this.send('paths-update', this._app.getPaths());
            }
            break;

            case 'dir-remove-project':
            dir = this._app.findDir(cnt);
            if(dir) {
                dir.removeProject();
                this.send('paths-update', this._app.getPaths());
            }
            break;

            case 'dir-project-properties':
            dir = this._app.findDir(cnt);
            if(dir) {
                cnt.properties = dir.getProject().getProperties();
                this.send('project-properties', cnt); // Now cnt not only contains hash, but also the properties
            }
            break;

            case 'update-project-properties':
            dir = this._app.findDir(cnt); // Contains a hash property
            if(dir) {
                dir.getProject().update(cnt.properties);
            }
            break;

            case 'dir-project-export':
            dir = this._app.findDir(cnt); // Contains a hash propety
            if(dir) {
                dir.getProject().build();
                this.send('notify', 'Building project ...');
            }
            break;

            case 'file-save':
            // Client has requested a save-action.
            // arg contains the contents of CM and maybe also a hash.
            this._app.saveFile(cnt);
            break;

            case 'dir-open':
            // Client requested a totally different folder.
            this._app.open('dir');
            break;

            case 'file-delete':
            if(cnt.hasOwnProperty('hash')) {
                this._app.removeFile(cnt.hash);
            } else if(this._app.getCurrentFile() != null) {
                this._app.removeFile();
            }
            break;

            case 'file-delete-from-vd':
            if(cnt.hasOwnProperty('hash') && cnt.hasOwnProperty('virtualdir')) {
                this._app.removeFromVirtualDir(cnt);
            }
            break;

            case 'dir-delete':
            if(cnt.hasOwnProperty('hash')) {
                this._app.removeDir(cnt.hash);
            } else if(this._app.getCurrentDir() != null) {
                this._app.removeDir();
            }
            break;

            case 'close-root':
            this._app.close(cnt);
            break;

            case 'file-search':
            // arg.content contains a hash of the file to be searched
            // and the prepared terms.
            let ret = this._app.findFile({ 'hash': cnt.hash }).search(cnt.terms);
            this.send('file-search-result', {
                'hash'  : cnt.hash,
                'result': ret
            });
            break;

            // Force-open is basically a search and immediate return.
            case 'force-open':
            let open = this._app.findExact(cnt); // Find an exact match
            if(open != null) {
                this._app.sendFile(open.hash);
            }
            break;

            // Change theme in config
            case 'toggle-theme':
            this._app.getConfig().set('darkTheme', !this._app.getConfig().get('darkTheme'));
            break;

            // Change snippet setting in config
            case 'toggle-snippets':
            this._app.getConfig().set('snippets', !this._app.getConfig().get('snippets'));
            break;

            case 'export':
            this._app.exportFile(cnt);
            break;

            // Rename a directory (arg.hash + arg.(new)name)
            case 'dir-rename':
            this._app.renameDir(cnt);
            break;

            case 'file-rename':
            this._app.renameFile(cnt);
            break;

            // Client requested a directory move
            case 'request-move':
            this._app.requestMove(cnt);
            break;

            case 'get-preferences':
            // Duplicate the object because we only need supportedLangs for the
            // renderer
            let toSend = JSON.parse(JSON.stringify(this._app.getConfig().getConfig()));
            toSend.supportedLangs = this._app.getConfig().getSupportedLangs();
            this.send('preferences', toSend);
            break;

            case 'get-pdf-preferences':
            // Get the same whole config object. ZettlrDialog will filter out
            // the PDF preferences. Why do we need the whole? Because the project
            // settings are a superset of PDF, so to save space, we'll re-use
            // their code, but to unify it we need these settings to access
            // obj.pdf instead of obj.
            this.send('pdf-preferences', this._app.getConfig().getConfig());
            break;

            case 'get-tags-preferences':
            this.send('tags-preferences', this._app.getTags().get());
            break;

            // Got a new config object
            case 'update-config':
            // Immediately reflect snippets and theme
            if(cnt.hasOwnProperty('darkTheme') && cnt.darkTheme != this._app.getConfig().get('darkTheme')) {
                this.send('toggle-theme', 'no-emit');
            }
            if(cnt.hasOwnProperty('snippets') && cnt.snippets != this._app.getConfig().get('snippets')) {
                this.send('toggle-snippets', 'no-emit');
            }
            if(cnt.hasOwnProperty('muteLines') && cnt.muteLines != this._app.getConfig().get('muteLines')) {
                this.send('config', { 'key': 'muteLines', 'value': cnt.muteLines});
            }
            if(cnt.hasOwnProperty('combinerState') && cnt.combinerState != this._app.getConfig().get('combinerState')) {
                this.send('config', { 'key': 'combinerState', 'value': cnt.combinerState});
            }
            this._app.getConfig().update(cnt);
            break;

            case 'update-tags':
            this._app.getTags().update(cnt);
            this.send('set-tags', cnt); // Send back to renderer so preview knows about this
            break;

            case 'get-tags':
            this.send('set-tags', this._app.getTags().get());
            break;

            // Renderer wants a configuration value
            case 'config-get':
            this.send('config', { 'key': cnt, 'value': this._app.getConfig().get(cnt) });
            break;

            case 'config-get-env':
            this.send('config', { 'key': cnt, 'value': this._app.getConfig().getEnv(cnt) });
            break;

            // SPELLCHECKING EVENTS
            case 'typo-request-lang':
            this.send('typo-lang', this._app.getConfig().get('spellcheck'));
            break;

            case 'typo-request-aff':
            this._app.retrieveDictFile('aff', cnt);
            break;

            case 'typo-request-dic':
            this._app.retrieveDictFile('dic', cnt);
            break;

            // UPDATE
            case 'update-check':
            this._app.checkForUpdate();
            break;

            // Handle dropped files/folders
            case 'handle-drop':
            this._app.handleAddRoots(cnt);
            break;

            // Statistics
            case 'request-stats-data':
            this.send('stats-data', this._app.getStats().getData());
            break;

            // Language file import
            case 'import-lang-file':
            this._app.importLangFile();
            break;

            // Import files and folders
            case 'import-files':
            this._app.importFile();
            break;

            default:
            console.log(trans('system.unknown_command', cmd));
            break;
        }
    }
}

module.exports = ZettlrIPC;
