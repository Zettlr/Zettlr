/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettlr class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is the main hub for everything that the main
 *                  process does. This means that here everything the app can
 *                  or cannot do come together.
 *
 * END HEADER
 */

const {dialog, app, BrowserWindow}  = require('electron');
const fs                            = require('fs');
const process                       = require('process');
const path                          = require('path');

// Internal classes
const ZettlrIPC                     = require('./zettlr-ipc.js');
const ZettlrWindow                  = require('./zettlr-window.js');
const ZettlrConfig                  = require('./zettlr-config.js');
const ZettlrTags                    = require('./zettlr-tags.js');
const ZettlrDir                     = require('./zettlr-dir.js');
const ZettlrFile                    = require('./zettlr-file.js');
const ZettlrWatchdog                = require('./zettlr-watchdog.js');
const ZettlrStats                   = require('./zettlr-stats.js');
const ZettlrUpdater                 = require('./zettlr-updater.js');
const ZettlrExport                  = require('./zettlr-export.js');
const {i18n, trans}                 = require('../common/lang/i18n.js');
const {hash, ignoreDir,
       ignoreFile, isFile, isDir}   = require('../common/zettlr-helpers.js');

const POLL_TIME                     = require('../common/data.json').poll_time;

/**
 * The Zettlr class handles every core functionality of Zettlr. Nothing works
 * without this. One object of Zettlr is created on initialization of the app
 * and will remain in memory until the app is quit completely. It will initialize
 * all additional classes that are needed, as well as prepare everything for
 * the main window to be opened. And, to complicate matters, my aim is to break
 * the 10.000 lines with this behemoth.
 */
class Zettlr
{
    /**
     * Create a new application object
     * @param {electron.app} parentApp The app object.
     */
    constructor(parentApp)
    {
        // INTERNAL VARIABLES
        this.currentFile = null;    // Currently opened file (object)
        this.currentDir = null;     // Current working directory (object)
        this.editFlag = false;      // Is the current opened file edited?
        this._openPaths = [];

        // INTERNAL OBJECTS
        this.window = null;         // Display content
        this.ipc = null;            // Communicate with said content
        this.app = parentApp;       // Internal pointer to app object
        this.config = null;         // Configuration file handler
        this.watchdog = null;       // Watchdog object

        this.config = new ZettlrConfig(this);
        // Init translations
        i18n(this.config.get('app_lang'));
        this.ipc = new ZettlrIPC(this);

        // Initiate tags
        this._tags = new ZettlrTags(this);

        // Initiate the watchdog
        this.watchdog = new ZettlrWatchdog();

        // Statistics
        this.stats = new ZettlrStats(this);

        // And the window.
        this.window = new ZettlrWindow(this);
        this.openWindow();

        // Read all paths into the app
        this.refreshPaths();

        // If there are any, open argv-files
        this.handleAddRoots(global.filesToOpen);

        this._updater = new ZettlrUpdater(this);

        // Initiate regular polling
        setTimeout(() => {
            this.poll();
        }, POLL_TIME);
    }

    /**
     * Performs recurring tasks such as polling the watchdog every five secs.
     * @return {void} Returns nothing.
     * @deprecated The watchdog polls will be put into an event listening system
     * in the future.
     */
    poll()
    {
        // Polls the watchdog for changes.
        if(this.watchdog.countChanges() > 0) {
            this.watchdog.each((t, p) => {
                // Available events: add, change, unlink, addDir, unlinkDir
                // No changeDir because this consists of one unlink and one add
                for(let root of this.getPaths()) {
                    if(root.isScope(p) !== false) {
                        root.handleEvent(p, t);
                        let isCurrentFile = (this.getCurrentFile() && (hash(p) == this.getCurrentFile().hash));
                        if(isCurrentFile && (t == 'unlink')) {
                            // We need to close the file
                            this.ipc.send('file-close');
                            this.getWindow().setTitle(''); // Reset window title
                            this.setCurrentFile(null); // Reset file
                        } else if(isCurrentFile && (t == 'change')) {
                            // Current file has changed -> ask to replace and do
                            // as the user wishes
                            if(this.getWindow().askReplaceFile()) {
                                this.ipc.send('file-open', this.getCurrentFile().withContent());
                            }
                        }
                    }
                }
            });

            // flush all changes so they aren't processed again next cycle
            this.watchdog.flush();
            // Send a paths update to the renderer to reflect the changes.
            this.ipc.send('paths-update', this.getPaths());
        }

        setTimeout(() => { this.poll(); }, POLL_TIME);
    }

    /**
     * Sends a notification together with a change event.
     * @param  {String} msg The message to be sent
     */
    notifyChange(msg)
    {
        this.ipc.send('paths-update', this.getPaths());
        this.notify(msg);
    }

    /**
     * Shutdown the app. This function is called on quit.
     * @return {void} Does not return anything.
     */
    shutdown()
    {
        this.config.save();
        this.stats.save();
        this.watchdog.stop();
        // Perform closing activity in the path.
        for(let p of this._openPaths) {
            p.shutdown();
        }
    }

    /**
     * Returns false if the file should not close, and true if it's safe.
     * @return {Boolean} Either true, if the window can close, or false.
     */
    canClose()
    {
        if(this.isModified()) {
            // The file is currently modified. Ask for saving.
            let ret = this.window.askSaveChanges();

            // Cancel: abort opening a new file
            if(ret == 0) {
                return false;
            }

            if(ret == 1) { // User wants to save the file first.
                this.ipc.send('file-save', {});
                return false;
                // TODO: Implement into the event arguments a "intent" of closing
            }

            // Mark as if nothing has been changed
            if(ret == 2) {
                this.clearModified();
            }
        }
        return true;
    }

    /**
     * This function is mainly called by the browser window to close the app.
     * @return {void} Does not return anything.
     */
    saveAndClose()
    {
        if(this.canClose()) {
            // Remember to clear the editFlag because otherwise the window
            // will refuse to close itself
            this.clearModified();
            app.quit();
        }
    }

    /***************************************************************************
    **                                                                        **
    **                                                                        **
    **                                                                        **
    **                          BEGIN EVENT HANDLE EVENTS                     **
    **                                                                        **
    **                                                                        **
    **                                                                        **
    ***************************************************************************/

    /**
     * Send a file with its contents to the renderer process.
     * @param  {Integer} arg An integer containing the file's hash.
     * @return {void}     This function does not return anything.
     */
    sendFile(arg)
    {
        if(!this.canClose()) {
            return;
        }

        // arg contains the hash of a file.
        // findFile now returns the file object
        let file = this.findFile({ 'hash': arg });

        if(file != null) {
            this.setCurrentFile(file);
            this.ipc.send('file-open', file.withContent());
        } else {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.fnf_title'),
                message: trans('system.error.fnf_message')
            });
        }
    }

    /**
     * Send a new directory list to the client.
     * @param  {Integer} arg A hash identifying the directory.
     * @return {void}     This function does not return anything.
     */
    selectDir(arg)
    {
        // arg contains a hash for a directory.
        let obj = this.findDir({ 'hash': arg });

        // Now send it back (the GUI should by itself filter out the files)
        if(obj != null && obj.isDirectory()) {
            this.setCurrentDir(obj);
        }
        else {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.dnf_title'),
                message: trans('system.error.dnf_message')
            });
        }
    }

    /**
     * Sorts a directory according to the argument
     * @param  {Object} arg An object containing both a hash and a sorting type
     */
    sortDir(arg)
    {
        if(!arg.hasOwnProperty('hash') || !arg.hasOwnProperty('type')) {
            return;
        }

        let dir = this.findDir({ 'hash': arg.hash });
        if(dir === null) {
            return;
        }

        dir.toggleSorting(arg.type);

        this.ipc.send('paths-update', this.getPaths());
    }

    /**
     * Create a new file.
     * @param  {Object} arg An object containing a hash of containing directory and a file name.
     * @return {void}     This function does not return anything.
     */
    newFile(arg)
    {
        // If the user ONLY decided to use special chars
        // or did not input anything abort the process.
        if(!this.canClose()) {
            return;
        }

        let dir = null, file = null;

        // There should be also a hash in the argument.
        if(arg.hasOwnProperty('hash')) {
            dir = this.findDir({'hash': arg.hash });
        } else {
            dir = this.getCurrentDir();
        }

        // Create the file
        try {
            file = dir.newfile(arg.name, this.watchdog);
        } catch(e) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.could_not_create_file'),
                message: e.message
            });
        }

        // Send the new paths and open the respective file.
        this.ipc.send('paths-update', this.getPaths());
        this.window.setTitle(file.name);
        this.setCurrentFile(file);
        this.ipc.send('file-open', file.withContent());
    }

    /**
     * Create a new directory.
     * @param  {Object} arg An object containing hash of containing and name of new dir.
     */
    newDir(arg)
    {
        let dir = null, curdir = null;

        if(arg.hasOwnProperty('hash')) {
            curdir = this.findDir({'hash': arg.hash });
        } else {
            curdir = this.getCurrentDir();
        }

        try {
            dir = curdir.newdir(arg.name, this.watchdog);
        } catch(e) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.could_not_create_dir'),
                message: e.message
            });
        }

        // Re-render the directories, and then as well the file-list of the
        // current folder.
        this.ipc.send('paths-update', this.getPaths());

        // Switch to newly created directory.
        this.setCurrentDir(dir);
    }

    /**
     * Creates a new virtual directory
     * @param  {Object} arg The argument, containing both the containing hash and the new name
     */
    newVirtualDir(arg)
    {
        let dir = null;
        if(arg.hasOwnProperty('hash')) {
            dir = this.findDir({'hash': arg.hash });
        } else {
            dir = this.getCurrentDir();
        }

        // Create the vd
        let vd = dir.addVirtualDir(arg.name);
        this.ipc.send('paths-update', this.getPaths());
        this.setCurrentDir(vd);
    }

    /**
     * Open a new root.
     * @param  {String} [type='dir'] 'dir' or 'file'. Necessary, because on windows
     *                               the dialog can only be either-or.
     */
    open(type = 'dir')
    {
        // The user wants to open another file or directory.
        let ret = this.window.askDir(require('electron').app.getPath('home'));

        // The user may have provided no path at all, which returns in an
        // empty array -> check against and abort if array is empty
        if(!(ret && ret.length)) {
            return;
        }

        // Ret is now an array. As we do not allow multiple selection, just
        // take the first index. TODO: Allow multiple selection
        ret = ret[0];

        if((isDir(ret) && ignoreDir(ret)) || (isFile(ret) && ignoreFile(ret))) {
            // We cannot add this dir, because it is in the list of ignored directories.
            return this.window.prompt({
                'type': 'error',
                'title': trans('system.error.ignored_dir_title'),
                'message': trans('system.error.ignored_dir_message', path.basename(ret))
            });
        }

        this.handleAddRoots([ret]);
    }

    /**
     * Handles a list of files and folders that the user in any way wants to add
     * to the app.
     * @param  {Array} filelist An array of absolute paths
     */
    handleAddRoots(filelist)
    {
        // As long as it's not a forbidden file or ignored directory, add it.
        let newFile, newDir;
        for(let f of filelist) {
            // First check if this thing is already added. If so, simply write
            // the existing file/dir into the newFile/newDir vars. They will be
            // opened accordingly.
            if(this.findFile({'path': f}) != null) {
                newFile = this.findFile({'path': f});
                // Also set the newDir variable so that Zettlr will automatically
                // navigate to the directory.
                newDir = newFile.parent;
            } else if(this.findDir({'path': f}) != null) {
                newDir = this.findDir({'path': f});
            } else if(this.getConfig().addPath(f)) {
                if(isFile(f)) {
                    newFile = new ZettlrFile(this, f);
                    this._openPaths.push(newFile);
                } else {
                    newDir = new ZettlrDir(this, f);
                    this._openPaths.push(newDir);
                }
            }
        }

        this._sortPaths();
        this.ipc.send('paths-update', this.getPaths());
        // Open the newly added path(s) directly.
        if(newDir)  { this.setCurrentDir(newDir);  }
        if(newFile) { this.sendFile(newFile.hash); }
    }

    /**
     * Removes a file.
     * @param  {Ineger} [hash=this.getCurrentFile().hash] The hash of the file to be deleted.
     * @return {void}                                   This function does not return.
     */
    removeFile(hash = this.getCurrentFile().hash)
    {
        // First determine if this is modified.
        if(!this.canClose()) {
            return;
        }

        let file = this.findFile({'hash': hash });

        if(!this.window.confirmRemove(file)) {
            return;
        }

        // Now that we are save, let's move the current file to trash.
        if(this.getCurrentFile() && (file.hash == this.getCurrentFile().hash)) {
            this.ipc.send('file-close', {});
            // Also re-set the title!
            this.window.setTitle();
            // Tell main & renderer to close file references
            this.setCurrentFile(null);
        }
        file.remove();
        this.ipc.send('paths-update', this.getPaths());
    }

    /**
     * Remove a directory.
     * @param  {Integer} [hash=this.getCurrentDir().hash] The hash of dir to be deleted.
     * @return {void}                                  This function does not return anything.
     */
    removeDir(hash = this.getCurrentDir().hash)
    {
        let filedir = null, dir = null;

        // First determine if this is modified.
        if(this.getCurrentFile() == null) {
            filedir = '';
        } else {
            filedir = this.getCurrentFile().parent; // Oh I knew this would be clever :>
        }

        dir = this.findDir({'hash': hash });

        if(filedir == dir && !this.canClose()) {
            return;
        }

        // roots can only be closed.
        if(this.getPaths().includes(dir.path)) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.delete_root_title'),
                message: trans('system.error.delete_root_message')
            });
        }

        if(!this.window.confirmRemove(dir)) {
            return;
        }

        // Close the current file, if there is one open
        if((this.getCurrentFile() != null) && dir.contains(this.getCurrentFile())) {
            this.closeFile();
        }

        if(dir == this.getCurrentDir()) {
            this.setCurrentDir(dir.parent); // Move up one level
        }

        // Now that we are save, let's move the current directory to trash.
        this.watchdog.ignoreNext('unlinkDir', dir.path);
        dir.remove();

        this.ipc.send('paths-update', this.getPaths());
    }

    /**
     * Removes a file from the index of a virtual directory.
     * @param  {Object} cnt Should contain both hash and virtualdir (also a hash)
     */
    removeFromVirtualDir(cnt)
    {
        let vd = this.findDir({ 'hash': cnt.virtualdir });
        let file = null;
        if(vd) {
            file = vd.findFile({ 'hash': cnt.hash });
        }
        if(vd && file) {
            vd.remove(file);
            this.ipc.send('paths-update', this.getPaths());
        }
    }

    /**
     * Export a file to another format. DEPRECATED: This function will be
     * moved into another class in further versions.
     * @param  {Object} arg An object containing hash and wanted extension.
     * @return {void}     Does not return.
     */
    exportFile(arg)
    {
        let file = this.findFile({ 'hash': arg.hash });
        let opt = {
            'format': arg.ext,      // Which format: "html", "docx", "odt", "pdf"
            'file': file,           // The file to be exported
            'dest': (this.config.get('export.dir') == 'temp') ? app.getPath('temp') : file.parent.path, // Either temp or cwd
            'tplDir': this.config.getEnv('templateDir'),
            'stripIDs': this.config.get('export.stripIDs'),
            'stripTags': this.config.get('export.stripTags'),
            'stripLinks': this.config.get('export.stripLinks'),
            'pdf': this.config.get('pdf'),
            'title': file.name.substr(0, file.name.lastIndexOf('.')),
            'author': this.config.get('pdf').author,
            'keywords': this.config.get('pdf').keywords
        };

        // Call the exporter.
        try {
            new ZettlrExport(opt); // TODO don't do this with instantiation
            this.notify(trans('system.export_success', opt.format.toUpperCase()));
        } catch(err) {
            this.notify(err.name + ': ' + err.message); // Error may be thrown
        }
    }

    /**
     * Renames a directory.
     * @param  {Object} arg An object containing a hash.
     * @return {void}     This function does not return anything.
     */
    renameDir(arg)
    {
        // { 'hash': hash, 'name': val }
        let dir = this.findDir({ 'hash': arg.hash});

        if(this.getPaths().includes(dir.path)) {
            // Don't rename a root
            this.window.prompt({
                type: 'error',
                title: trans('system.error.rename_root_title'),
                message: trans('system.error.rename_root_message')
            });
            return;
        }

        let oldDir = path.dirname(dir.path);

        // Save for later whether this is the currentDir (have to re-send dir list)
        let isCurDir = ((this.getCurrentDir() != null) && (dir.hash == this.getCurrentDir().hash)) ? true : false;
        let oldPath = null;

        if((this.getCurrentFile() !== null) && (dir.findFile({ 'hash': this.getCurrentFile().hash }) !== null)) {
            // The current file is in said dir so we need to trick a little bit
            oldPath = this.getCurrentFile().path;
            let relative = oldPath.replace(dir.path, ""); // Remove old directory to get relative path
            // Re-merge:
            oldPath = path.join(oldDir, arg.name, relative); // New path now
            // Hash it
            oldPath = hash(oldPath);
        }

        // Move to same location with different name
        dir.move(oldDir, arg.name);

        this.ipc.send('paths-update', this.getPaths());

        if(isCurDir) {
            this.ipc.send('set-current-dir', dir);
        }

        if(oldPath != null) {
            // Re-set current file in the client
            let nfile = dir.findFile({ 'hash': oldPath });
            this.setCurrentFile(nfile);
        }
    }

    /**
     * Renames a file.
     * @param  {Object} arg An object containing hash and name.
     * @return {void}     This function does not return.
     */
    renameFile(arg)
    {
        // { 'hash': hash, 'name': val }
        let file = null;

        // Possibilities: Non-opened file or opened file
        if(this.getCurrentFile() && (this.getCurrentFile().hash == arg.hash)) {
            // Current file should be renamed.
            file = this.getCurrentFile();
            file.rename(arg.name, this.getWatchdog());
            // Set current file to reflect changes in hash
            this.ipc.send('file-set-current', file);

            // Adapt window title
            let title = this.window.getTitle();
            if(title.indexOf('*') > -1) {
                title = "*" + this.getCurrentFile().name;
            } else {
                title = this.getCurrentFile().name;
            }

            this.window.setTitle(title);
        } else {
            // Non-open file should be renamed.
            file = this.findFile({'hash': arg.hash});
            file.rename(arg.name, this.getWatchdog()); // Done.
        }

        this.ipc.send('paths-update', this.getPaths());
    }

    /**
     * Move a directory or a file.
     * @param  {Object} arg An object containing the hash of source and destination
     * @return {void}     This function does not return anything.
     */
    requestMove(arg)
    {
        // arg contains from and to
        let from = this.findDir({ 'hash': arg.from });
        if(from == null) {
            // Obviously a file!
            from = this.findFile({ 'hash': arg.from });
        }

        let to = this.findDir({ 'hash': arg.to });

        // Let's check that:
        if(from.contains(to)) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.move_into_child_title'),
                message: trans('system.error.move_into_child_message')
            });
        }

        // Now check if there already is a directory/file with the same name
        if(to.hasChild({ 'name': from.name })) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.already_exists_title'),
                message: trans('system.error.already_exists_message', from.name)
            });
        }

        // Now check if we've actually gotten a virtual directory
        if(to.isVirtualDirectory() && from.isFile()) {
            // Then simply attach.
            to.attach(from);
            // And, of course, refresh the renderer.
            this.ipc.send('paths-update', this.getPaths());
            return;
        }

        let newPath = null;

        if(from.isFile() && (this.getCurrentFile() != null) && (from.hash == this.getCurrentFile().hash)) {
            // Current file is to be moved
            // So move the file and immediately retrieve the new path
            this.watchdog.ignoreNext('unlink', from.path);
            this.watchdog.ignoreNext('add', path.join(to.path, from.name));
            from.move(to.path);
            to.attach(from);

            // Now our current file has been successfully moved and will
            // save correctly. Problem? The client needs it as well.
            // We have to set current dir (the to-dir) and current file AND
            // select it.
            this.setCurrentDir(to); // Current file is still correctly set
            this.ipc.send('paths-update', this.getPaths());
            return;
        } else if((this.getCurrentFile() !== null)
        && (from.findFile({ 'hash': this.getCurrentFile().hash }) !== null)) {
            // The current file is in said dir so we need to trick a little bit
            newPath = this.getCurrentFile().path;
            let relative = newPath.replace(from.path, ""); // Remove old directory to get relative path
            // Re-merge:
            newPath = path.join(to.path, from.name, relative); // New path now
            // Hash it
            newPath = hash(newPath);
        }

        if(from.isDirectory()) {
            // TODO: Think of something to ignore _all_ events emanating from
            // the directory (every file will also trigger an unlink/add-couple)
            this.watchdog.ignoreNext('unlinkDir', from.path);
            this.watchdog.ignoreNext('addDir', path.join(to.path, from.name));
        } else if(from.isFile()) {
            this.watchdog.ignoreNext('unlink', from.path);
            this.watchdog.ignoreNext('add', path.join(to.path, from.name));
        }

        from.move(to.path);
        // Add directory or file to target dir
        to.attach(from);

        this.ipc.send('paths-update', this.getPaths());

        if(newPath != null) {
            // Find the current file and reset the pointers to it.
            this.setCurrentFile(from.findFile({ 'hash': newPath}));
        }
    }

    // SPELLCHECKING RELATED FUNCTIONS

    /**
     * Loads a DIC or AFF file and sends it to the renderer.
     * @param  {String} type Either 'dic' or 'aff'
     * @param  {String} lang Which language dic/aff to load?
     * @return {void}      This function does not return.
     */
    retrieveDictFile(type, lang)
    {
        let p = path.join(
            path.dirname(__dirname),
            'renderer',
            'assets',
            'dict',
            lang,
            lang + '.' + type
        );

        try {
            fs.lstatSync(p);
        } catch(e) {
            return; // Don't continue the event chain to enable spell checking
        }

        fs.readFile(p, 'utf8', (err, data) => {
            // Send the data directly back to the client once it has been read
            this.ipc.send('typo-' + type, data);
        });
    }

    /***************************************************************************
    **                                                                        **
    **                                                                        **
    **                                                                        **
    **                           END EVENT HANDLE EVENTS                      **
    **                                                                        **
    **                                                                        **
    **                                                                        **
    ***************************************************************************/

    /**
     * Reloads the complete directory tree.
     * @return {void} This function does not return anything.
     */
    refreshPaths()
    {
        this._openPaths = [];
        // Reload all opened files, garbage collect will get the old ones.
        for(let p of this.getConfig().get('openPaths')) {
            if(isFile(p)) {
                this._openPaths.push(new ZettlrFile(this, p))
            } else if(isDir(p)) {
                this._openPaths.push(new ZettlrDir(this, p));
            }
        }
        this.setCurrentDir(null);
        this.setCurrentFile(null);
    }

    /**
     * Initiates the search for an update.
     */
    checkForUpdate()
    {
        this._updater.check();
    }

    /**
     * Simple wrapper for notifications.
     * @param  {String} message The message to be sent to the renderer.
     */
    notify(message)
    {
        this.ipc.send('notify', message);
    }

    // Save a file. A file MUST be given, for the content is needed to write to
    // a file. The content is always freshly grabbed from the CodeMirror content.

    /**
     * Saves a file.
     * @param  {Object} file An object containing some properties of the file.
     * @return {void}      This function does not return.
     */
    saveFile(file)
    {
        if((file == null) || !file.hasOwnProperty('content')) {
            // No file given -> abort saving process
            return;
        }

        let cnt = file.content;

        // Update word count
        this.stats.updateWordCount(file.wordcount || 0);

        // This function saves a file to disk.
        // But: The hash is "null", if someone just
        // started typing with no file open.
        if(!file.hasOwnProperty('hash') || file.hash == null) {
            // For ease create a new file in current directory.
            if(this.getCurrentDir() == null) {
                return this.notify('Cannot save file: You must select a directory in which the file should be created!');
            }
            file = this.getCurrentDir().newfile(null, this.watchdog);
        } else {
            let f = this.getCurrentFile(); //this.findFile({ 'hash': file.hash });
            if(f == null) {
                return this.window.prompt({
                    type: 'error',
                    title: trans('system.error.fnf_title'),
                    message: trans('system.error.fnf_message')
                });
            }
            file = f;
        }

        // Ignore the next change for this specific file
        this.watchdog.ignoreNext('change', file.path);
        file.setContent(cnt);
        file.save();
        this.clearModified();
        // Immediately update the paths in renderer so that it is able to find
        // the file to (re)-select it.
        // this.ipc.send('paths-update', this.getPaths());
        this.ipc.send('file-update', file);

        // Switch to newly created file (only happens before a file is selected)
        if(this.getCurrentFile() == null) {
            this.setCurrentFile(file);
            // "Open" this file.
            this.sendFile(file.hash);
        }
    }

    /**
     * Wrapper to find files within all open paths
     * @param  {Object} obj An object that conforms with ZettlrDir/ZettlrFile::findFile()
     * @return {Mixed}     ZettlrFile or null
     */
    findFile(obj)
    {
        let found = null;
        for(let p of this.getPaths()) {
            found = p.findFile(obj);
            if(found != null) {
                return found;
            }
        }

        return null;
    }

    /**
     * Wrapper around findDir
     * @param  {Object} obj An object that conforms with ZettlrDir/ZettlrFile::findDir()
     * @return {Mixed}     ZettlrDir or null
     */
    findDir(obj)
    {
        let found = null;
        for(let p of this.getPaths()) {
            found = p.findDir(obj);
            if(found != null) {
                return found;
            }
        }

        return null;
    }

    /**
     * Either returns one file that matches its ID with the given term or null
     * @param  {String} term The ID to be searched for
     * @return {ZettlrFile}      The exact match, or null.
     */
    findExact(term)
    {
        let found = null;
        for(let p of this.getPaths()) {
            found = p.findExact(term);
            if(found != null) {
                return found;
            }
        }

        return null;
    }

    /**
     * Closes an open file/dir if the hashes match
     * @param  {Number} hash The hash to be closed
     */
    close(hash)
    {
        for(let p of this.getPaths()) {
            if(p.getHash() == hash) {
                // If it's the current file, close it
                if(p === this.getCurrentFile()) {
                    this.ipc.send('file-close');
                    this.getWindow().setTitle('');
                }
                if(p === this.getCurrentDir()) {
                    this.setCurrentDir(null);
                }
                this.getConfig().removePath(p.getPath());
                this.getPaths().splice(this.getPaths().indexOf(p), 1);
                this.ipc.send('paths-update', this.getPaths());
                break;
            }
        }
    }

    /**
     * Called when a root file is renamed.
     */
    sort()
    {
        this._sortPaths();
    }

    /**
     * Sorts currently opened root paths
     */
    _sortPaths()
    {
        let f = [];
        let d = [];

        for(let p of this.getPaths()) {
            if(p.isFile()) {
                f.push(p);
            } else {
                d.push(p);
            }
        }

        f = f.sort((a, b) => {
            if(a.getName() < b.getName()) {
                return -1
            } else if(a.getName() > b.getName()) {
                return 1;
            } else {
                return 0;
            }
        });

        d = d.sort((a, b) => {
            if(a.getName() < b.getName()) {
                return -1
            } else if(a.getName() > b.getName()) {
                return 1;
            } else {
                return 0;
            }
        });

        this._openPaths = f.concat(d);
    }

    /**
     * Sets the current file to the given file.
     * @param {ZettlrFile} f A ZettlrFile object.
     */
    setCurrentFile(f)
    {
        if(f == null) {
            // Dereference
            this.currentFile = null;
            this.ipc.send('file-set-current', null);
            return;
        }

        if(this.window != null) {
            if(f.isRoot()) {
                this.window.setTitle(f.path);
            } else {
                this.window.setTitle(f.name);
            }
        }
        this.currentFile = f;
        this.ipc.send('file-set-current', f.hash);
    }

    /**
     * Sets the current directory.
     * @param {ZettlrDir} d Directory to be selected.
     */
    setCurrentDir(d)
    {
        // Set the dir
        this.currentDir = d;
        // HOLY SHIT. Sending only the hash instead of the whole object (which
        // has to be crunched to be send through the pipe) is SO MUCH FASTER.
        // Especially with virtual directories, because they got a LOT of
        // recursive stuff going on. And we can be sure, that this directory
        // will definitely exist in the renderer's memory, b/c we re-send the
        // paths each time we change them. So renderer should always be on the
        // newest update.
        this.ipc.send('dir-set-current', (d) ? d.hash : null);
    }

    /**
     * Closes the current file and takes care of all steps necessary to accomodate.
     */
    closeFile()
    {
        this.window.setTitle('');
        this.setCurrentFile(null);
        this.ipc.send('file-close', {});
    }

    /**
     * Indicate modifications.
     * @return {void} Nothing to return here.
     */
    setModified()
    {
        this.window.setModified();
        this.editFlag = true;
    }

    /**
     * Remove the modification flag. Also notify the renderer process so that
     * the editor can mark itself clear as well.
     * @return {void} Nothing to return.
     */
    clearModified()
    {
        this.window.clearModified();
        this.editFlag = false;
        this.ipc.send('mark-clean');
    }

    // Getters

    /**
     * Returns the window instance.
     * @return {ZettlrWindow} The main window
     */
    getWindow()      { return this.window; }

    /**
     * Returns the IPC instance.
     * @return {ZettlrIPC}  The IPC object
     */
    getIPC()         { return this.ipc; }

    /**
     * Returns the directory tree.
     * @return {ZettlrDir} The root directory pointer.
     */
    getPaths()       { return this._openPaths; }

    /**
     * Returns the ZettlrConfig object
     * @return {ZettlrConfig} The configuration
     */
    getConfig()      { return this.config; }

    /**
     * Returns the ZettlrTags object
     * @return {ZettlrTags} The tags object
     */
    getTags()        { return this._tags; }

    /**
     * Returns the updater
     * @return {ZettlrUpdater} The updater.
     */
    getUpdater()     { return this._updater; }

    /**
     * Returns the watchdog
     * @return {ZettlrWatchdog} The watchdog instance.
     */
    getWatchdog()    { return this.watchdog; }

    /**
     * Returns the stats
     * @return {ZettlrStats} The stats object.
     */
    getStats()       { return this.stats; }

    /**
     * Get the current directory.
     * @return {ZettlrDir} Current directory.
     */
    getCurrentDir()  { return this.currentDir; }

    /**
     * Return the current file.
     * @return {Mixed} ZettlrFile or null.
     */
    getCurrentFile() { return this.currentFile; }

    /**
     * Called by the root directory to determine if it is root.
     * @return {Boolean} Always returns false.
     */
    isDirectory()    { return false; }

    /**
     * Is the current file modified?
     * @return {Boolean} Return true, if there are unsaved changes, or false.
     */
    isModified()     { return this.editFlag; }

    /**
     * Open a new window.
     * @return {void} This does not return.
     */
    openWindow()     { this.window.open(); }

    /**
     * Close the current window.
     * @return {void} Does not return.
     */
    closeWindow()    { this.window.close(); }
}

// Export the module on require()
module.exports = Zettlr;
