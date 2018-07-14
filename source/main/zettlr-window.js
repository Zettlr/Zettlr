/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrWindow class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is responsible for the main window of Zettlr. It
 *                  opens it, closes it, controls the title and diverse other
 *                  stuff that has to do with the window itself (such as showing
 *                  modal boxes, e.g. errors or dialogs for opening new paths.)
 *
 * END HEADER
 */

const electron                = require('electron');
const {dialog, BrowserWindow} = electron;
const url                     = require('url');
const path                    = require('path');
const {trans}                 = require('../common/lang/i18n.js');
const ZettlrMenu              = require('./zettlr-menu.js');

/**
 * This class is a wrapper for electron's BrowserWindow class with some functions
 * that make the handling of it much more easy. But besides of that, it's not
 * much.
 */
class ZettlrWindow
{
    /**
     * Initiate a new window.
     * @param {Zettlr} parent The main zettlr object.
     */
    constructor(parent)
    {
        this._app = parent;
        this._win = null;
        this._menu = null;
    }

    /**
     * Create and open a new main window
     * @return {ZettlrWindow} Again this for chainability.
     */
    open()
    {
        if(this._win != null) {
            // There is still a window active, so don't do anything (one-window app)
            return;
        }

        let screensize = electron.screen.getPrimaryDisplay().workAreaSize;

        // First create a new browserWindow
        this._win = new BrowserWindow({
            width: screensize.width,
            height: screensize.height,
            acceptFirstMouse: true,
            minWidth:800,
            minHeight:450,
            show: false,
            icon: 'icons/png/64x64.png',
            backgroundColor: '#fff',
            scrollBounce: true, // The nice scrolling effect for macOS
            defaultEncoding: 'utf8' // Why the hell does this default to ISO?
        });

        // Then activate listeners.
        // and load the index.html of the app.
        this._win.loadURL(url.format({
            pathname: path.join(__dirname, '../renderer/assets/index.htm'),
            protocol: 'file:',
            slashes: true
        }));

        // EVENT LISTENERS

        // Only show window once it is completely initialized + maximize it
        this._win.once('ready-to-show', () => {
            this._win.show();
            this._win.maximize();
        });

        // Emitted when the window is closed.
        this._win.on('closed', () => {
            this.close();
        });

        // Emitted when the user wants to close the window.
        this._win.on('close', (event) => {
            // Only check, if we can close. Unless we can, abort closing process.
            if(!this.canClose()) {
                event.preventDefault();
                // Parent's (ZettlrWindow) parent (Zettlr)
                this._app.saveAndClose();
            } else {
                // We can close - so clear down the cache in any case
                let ses = this._win.webContents.session;
                // Do not "clearCache" because that would only delete my own index files
                ses.clearStorageData({
                    storages: [
                        'appcache',
                        'cookies',          // Nobody needs cookies except for downloading pandoc etc
                        'localstorage',
                        'shadercache',      // Should never contain anything
                        'websql'
                    ]
                });
            }
        });

        // Prevent closing if unable to comply
        this._win.beforeunload = (e) => {
            if(!this.canClose()) {
                // Prevent closing for now.
                e.returnValue = false;
                // And ask the user to save changes. The parent will then re-
                // emit the close-event which in the second round will not
                // trigger this if-loop.
                this._app.saveAndClose();
            }
        };

        // Set the application menu
        this._menu = new ZettlrMenu(this);

        return this;
    }
    // END this.open

    /**
     * Sets the title and always appends Zettlr to it.
     * @param {String} [newTitle=''] The new title to set.
     * @return {ZettlrWindow} This for chainability.
     */
    setTitle(newTitle = '')
    {
        if(newTitle == '') {
            newTitle = 'Zettlr';
        } else {
            newTitle += ' — Zettlr';
        }

        this._win.setTitle(newTitle);
    }

    /**
     * Returns the current window title
     * @return {String} The window's current title.
     */
    getTitle()
    {
        return this._win.getTitle();
    }

    /**
     * Indicates that there are unsaved changes with a star in title and, on
     * macOS, also the indicator in the traffic lights.
     * @return {ZettlrWindow} This for chainability.
     */
    setModified()
    {
        // Set the modified flag on the window if the file is edited (macOS only)
        // Function does nothing if not on macOS
        if(this._win != null) {
            this._win.setDocumentEdited(true);
        }

        return this;
    }

    /**
     * Removes any marks that indicate modifications.
     * @return {ZettlrWindow} This for chainability.
     */
    clearModified()
    {
        // Clear the modified flag on the window if the file is edited (macOS only)
        if(this._win != null) {
            this._win.setDocumentEdited(false);
        }

        return this;
    }

    /**
     * Returns the current window instance (or null, if window is null)
     * @return {Mixed} Either a BrowserWindow instance or null
     */
    getWindow()
    {
        return this._win;
    }

    // FUNCTIONS CALLED FROM WITHIN EVENT LISTENERS

    /**
     * Dereference a window if it has been destroyed (called by BrowserWindow)
     * @return {void} Does not return anything.
     */
    close()
    {
        // Dereference the window.
        this._win = null;
    }

    /**
     * Can we close the window?
     * @return {Boolean} Returns either true or false depending on modification flag on parent.
     */
    canClose()
    {
        return this._app.canClose();
    }

    /**
     * Prompt the user to save or omit changes, or cancel the process completely.
     * @return {Integer} Either 0 (cancel), 1 (save changes) or 2 (omit changes)
     */
    askSaveChanges()
    {
        let options = {
            type: "question",
            title: trans('system.save_changes_title'),
            message: trans('system.save_changes_message'),
            buttons: [
                trans('system.save_changes_cancel'),
                trans('system.save_changes_save'),
                trans('system.save_changes_omit')
            ],
            cancelId: 0
        };

        let ret = dialog.showMessageBox(this._win, options);

        // ret can have three status: cancel = 0, save = 1, omit = 2.
        // To keep up with semantics, the function "askSaveChanges" would
        // naturally return "true" if the user wants to save changes and "false"
        // - so how deal with "omit" changes?
        // Well I don't want to create some constants so let's just leave it
        // with these three values.
        return ret;
    }

    /**
     * The currently opened file's contents have changed on disk -- reload?
     * @return {Integer} 0 (Do not replace the file) or 1 (Replace the file)
     */
    askReplaceFile()
    {
        let options = {
            type: "question",
            title: trans('system.replace_file_title'),
            message: trans('system.replace_file_message'),
            buttons: [
                trans('system.cancel'),
                trans('system.ok'),
            ],
            cancelId: 0
        };

        let ret = dialog.showMessageBox(this._win, options);

        // ret can have three status: cancel = 0, save = 1, omit = 2.
        // To keep up with semantics, the function "askSaveChanges" would
        // naturally return "true" if the user wants to save changes and "false"
        // - so how deal with "omit" changes?
        // Well I don't want to create some constants so let's just leave it
        // with these three values.
        return (ret == 1);
    }

    /**
     * Show the dialog for choosing a new project directory
     * @param  {String} startDir Which directory should be shown initially?
     * @return {Array}          An array containing all selected paths.
     */
    askDir(startDir)
    {
        return dialog.showOpenDialog(this._win, {
            title: trans('system.open_folder'),
            defaultPath: startDir,
            properties: [
                'openDirectory',
                'createDirectory' // macOS only
            ]
        });
    }

    /**
     * This function prompts the user with information.
     * @param  {Object} options Necessary informations for displaying the prompt
     * @return {ZettlrWindow}         This for chainability.
     */
    prompt(options)
    {
        if(typeof options == 'string') {
            options = { 'message': options };
        }

        dialog.showMessageBox(this._win, {
            type: options.type || 'info',
            buttons: [ 'Ok' ],
            defaultId: 0,
            title: options.title || 'Zettlr',
            message: options.message
        });

        return this;
    }

    /**
     * Ask to remove the given object (either ZettlrFile or ZettlrDirectory)
     * @param  {Mixed} obj Either ZettlrFile or ZettlrDirectory
     * @return {Boolean}     True if user wishes to remove it, or false.
     */
    confirmRemove(obj)
    {
        let ret = dialog.showMessageBox(this._win, {
            type: 'warning',
            buttons: [ 'Ok', trans('system.error.cancel_remove') ],
            defaultId: 1,
            title: trans('system.error.remove_title'),
            message: trans('system.error.remove_message', obj.name)
        });

        // 0 = Ok, 1 = Cancel

        return (ret == 0);
    }

    /**
     * Returns the Zettlr main object
     * @return {Zettlr} The parent app object
     */
    getApp() { return this._app; }
}

module.exports = ZettlrWindow;
