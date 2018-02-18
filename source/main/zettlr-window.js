/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrWindow class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
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
 * Begin ZettlrWindow class
 */
class ZettlrWindow
{
    /**
     * Initiate a new window.
     * @param {Zettlr} parent The main zettlr object.
     */
    constructor(parent)
    {
        this.parent = parent;
        this.window = null;
        this.menu = null;
    }

    /**
     * Create and open a new main window
     * @return {ZettlrWindow} Again this for chainability.
     */
    open()
    {
        if(this.window != null) {
            // There is still a window active, so don't do anything (one-window app)
            return;
        }

        let screensize = electron.screen.getPrimaryDisplay().workAreaSize;

        // First create a new browserWindow
        this.window = new BrowserWindow({
            width: screensize.width,
            height: screensize.height,
            minWidth:800,
            minHeight:450,
            show: false,
            icon: 'icons/png/64x64.png',
            backgroundColor: '#fff',
            scrollBounce: true, // The nice scrolling effect for macOS
            defaultEncoding: 'utf8', // Why the hell does this default to ISO?
            // devTools: false, ---- TODO: ACTIVATE WHEN READY WITH DEVELOPING
        });

        // Save this object as a parent to the browser window
        // this.window.parent = this;

        // Then activate listeners.
        // and load the index.html of the app.
        this.window.loadURL(url.format({
            pathname: path.join(__dirname, '../renderer/assets/index.htm'),
            protocol: 'file:',
            slashes: true
        }));

        // EVENT LISTENERS

        // Only show window once it is completely initialized + maximize it
        this.window.once('ready-to-show', () => {
            this.window.show();
            this.window.maximize();
        });

        // Emitted when the window is closed.
        this.window.on('closed', () => {
            this.close();
        });

        // Emitted when the user wants to close the window.
        this.window.on('close', (event) => {
            // Only check, if we can close. Unless we can, abort closing process.
            if(!this.canClose()) {
                event.preventDefault();
                // Parent's (ZettlrWindow) parent (Zettlr)
                this.parent.saveAndClose();
            } else {
                // We can close - so clear down the cache in any case
                let ses = this.window.webContents.session;
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
        this.window.beforeunload = (e) => {
            if(!this.canClose()) {
                // Prevent closing for now.
                e.returnValue = false;
                // And ask the user to save changes. The parent will then re-
                // emit the close-event which in the second round will not
                // trigger this event.
                this.parent.saveAndClose();
            }
        };

        // Set the application menu
        // require('./main-menu.js');
        this.menu = new ZettlrMenu(this);

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

        this.window.setTitle(newTitle);
    }

    /**
     * Returns the current window title
     * @return {String} The window's current title.
     */
    getTitle()
    {
        return this.window.getTitle();
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
        if(this.window != null) {
            this.window.setDocumentEdited(true);
        }
        // Indicate in title (for all OS)
        let title = this.window.getTitle();
        if(title.substr(0, 2) != "* ") {
            this.window.setTitle('* ' + title);
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
        if(this.window != null) {
            this.window.setDocumentEdited(false);
        }
        // Indicate in title
        let title = this.window.getTitle();
        if(title.substr(0, 2) == "* ") {
            this.window.setTitle(title.substr(2));
        }

        return this;
    }

    /**
     * Returns the current window instance (or null, if window is null)
     * @return {Mixed} Either a BrowserWindow instance or null
     */
    getWindow()
    {
        return this.window;
    }

    // FUNCTIONS CALLED FROM WITHIN EVENT LISTENERS

    /**
     * Dereference a window if it has been destroyed (called by BrowserWindow)
     * @return {void} Does not return anything.
     */
    close()
    {
        // Dereference the window.
        this.window = null;
    }

    /**
     * Can we close the window?
     * @return {Boolean} Returns either true or false depending on modification flag on parent.
     */
    canClose()
    {
        return this.parent.canClose();
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

        let ret = dialog.showMessageBox(this.window, options);

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

        let ret = dialog.showMessageBox(this.window, options);

        // ret can have three status: cancel = 0, save = 1, omit = 2.
        // To keep up with semantics, the function "askSaveChanges" would
        // naturally return "true" if the user wants to save changes and "false"
        // - so how deal with "omit" changes?
        // Well I don't want to create some constants so let's just leave it
        // with these three values.
        return ret;
    }

    /**
     * Show the dialog for choosing a new project directory
     * @param  {String} startDir Which directory should be shown initially?
     * @return {Array}          An array containing all selected paths.
     */
    askDir(startDir)
    {
        return dialog.showOpenDialog(this.window, {
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
        dialog.showMessageBox(this.window, {
            type: options.type,
            buttons: [ 'Ok' ],
            defaultId: 0,
            title: options.title,
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
        let ret = dialog.showMessageBox(this.window, {
            type: 'warning',
            buttons: [ 'Ok', trans('system.error.cancel_remove') ],
            defaultId: 1,
            title: trans('system.error.remove_title'),
            message: trans('system.error.remove_message', obj.name)
        });

        return (ret == 0);
    }
}

module.exports = ZettlrWindow;
