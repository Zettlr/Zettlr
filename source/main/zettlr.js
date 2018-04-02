/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettlr class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
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
const {exec}                        = require('child_process');

// Internal classes
const ZettlrIPC                     = require('./zettlr-ipc.js');
const ZettlrWindow                  = require('./zettlr-window.js');
const ZettlrConfig                  = require('./zettlr-config.js');
const ZettlrDir                     = require('./zettlr-dir.js');
const ZettlrFile                    = require('./zettlr-file.js');
const ZettlrWatchdog                = require('./zettlr-watchdog.js');
const ZettlrStats                   = require('./zettlr-stats.js');
const ZettlrUpdater                 = require('./zettlr-updater.js');
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
        this.paths = null;            // All directories and md files, as objects
        this.currentFile = null;    // Currently opened file (object)
        this.currentDir = null;     // Current working directory (object)
        this.editFlag = false;      // Is the current opened file edited?

        // Let's finally try the multi-root
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

        // Initiate the watchdog
        this.watchdog = new ZettlrWatchdog();

        // Initiate the directory tree
        // this.paths = new ZettlrDir(this, this.config.get('projectDir'));

        // set currentDir pointer to null (WARNING somewhere I've assumed
        // currentDir never to be null!!!! HAVE to double check that!)
        this.currentDir = null;

        // Statistics
        this.stats = new ZettlrStats(this);

        // And the window.
        this.window = new ZettlrWindow(this);
        this.openWindow();

        // Read all paths into the app
        this.refreshPaths();

        this._updater = new ZettlrUpdater(this);

        // Initiate regular polling
        setTimeout(() => {
            this.poll();
        }, POLL_TIME);
    }

    /**
     * Performs recurring tasks such as polling the watchdog every five secs.
     * @return {void} Returns nothing.
     */
    poll()
    {
        // Polls the watchdog for changes.
        if(this.watchdog.countChanges() > 0) {
            this.watchdog.each((t, p) => {
                // Available events: add, change, unlink, addDir, unlinkDir
                // No changeDir because this consists of one unlink and one add
                let f = this.paths.findFile({ 'path': p });
                let based = this.paths.findDir({ 'path': path.dirname(p) });
                let d = this.paths.findDir({'path':p});
                let x = p;
                switch(t) {
                    case 'add':
                    if(based) {
                        f = based.addChild(p);
                        this.ipc.send('notify', `File ${f.name} added.`);
                    }
                    break;

                    case 'change':
                    if(f == this.getCurrentFile()) {
                        let ret = this.window.askReplaceFile();
                        // 1 = do it, 0 = don't
                        if(ret == 1) {
                            f.update();
                            this.clearModified();
                            this.ipc.send('file-close', {});
                            this.ipc.send('file-open', f.withContent());
                        }
                    } else {
                        f.update();
                        this.ipc.send('notify', `File ${f.name} changed remotely.`);
                    }
                    break;

                    case 'unlink':
                    if(f == null) { // Happens on move
                        break;
                    }
                    f.remove();
                    this.ipc.send('notify', `File ${f.name} has been removed.`);
                    if(f === this.getCurrentFile()) {
                        this.ipc.send('file-close', {});
                        this.clearModified();
                        this.setCurrentFile(null);
                        this.window.setTitle();
                    }
                    break;

                    case 'addDir':
                    d = null;
                    do {
                        x = path.dirname(p);
                        d = this.paths.findDir({'path': x});
                    } while(d === null);
                    if(d != null) {
                        d.addChild(p);
                    } // Else: Silently fail
                    break;

                    case 'unlinkDir':
                    if(d != null) {
                        if(d == this.getCurrentDir()) {
                            this.setCurrentDir(d.parent);
                        }
                        d.remove();
                        this.ipc.send('notify', `Directory ${d.name} has been removed.`);
                    }
                    break;

                    default:
                    this.ipc.send('notify', `Unknown event ${t} on path ${p}.`);
                    break;
                }
            });

            // flush all changes so they aren't processed again next cycle
            this.watchdog.flush();

            // Notify the renderer of changes
            this.ipc.send('paths-update', this.paths);
        }

        setTimeout(() => { this.poll(); }, POLL_TIME);
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

    /**
     * Reloads the complete application.
     * @param  {String} [newPath=null] A new path, or null.
     * @return {void}                Does not return anything.
     */
    reload(newPath = null)
    {
        // The application has requested a full reload of the data because the
        // user wants to provide a new path. So basically perform everything in
        // init except loading the config file.
        if(newPath == null) {
            // Reload with current projectDir given.
            newPath = this.config.get('projectDir');
        }

        // Funny if a normal reload will be done; criss cross variable assignment
        this.config.set('projectDir', newPath);

        // Re-Read the paths
        this.refreshPaths();
        // And file pointers (e.g. begin at the root with no file open)
        this.resetCurrents();

        // Restart watchdog with old/new path
        this.watchdog.setPath(this.config.get('projectDir'));
        this.watchdog.restart();
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
        // getFile now returns the file object
        let file = null;
        for(let p of this.getPaths()) {
            file = p.findFile({ 'hash': arg });
            if(file != null) {
                break;
            }
        }

        if(file != null) {
            this.ipc.send('file-open', file.withContent());
            this.setCurrentFile(file);
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
        let obj = null;
        for(let p of this.getPaths()) {
            obj = p.findDir({ 'hash': arg });
            if(obj != null) {
                break;
            }
        }

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
            dir = this.paths.findDir({'hash': arg.hash });
        } else {
            dir = this.getCurrentDir();
        }

        // The function returns the new file (and returns it, or null on error)
        if(dir.exists(path.join(dir.path, arg.name))) {
            // Already exists.
            this.window.prompt({
                type: 'error',
                title: trans('system.error.could_not_create_file'),
                message: trans('system.error.file_exists')
            });
            return;
        }
        file = dir.newfile(arg.name);
        // Immediately ignore the event (path can have changed if arg.name is empty)
        this.watchdog.ignoreNext('add', file.path);

        // This gets executed if arg contained no allowed chars, so warn.
        if(file == null) {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.could_not_create_file'),
                message: trans('system.error.no_allowed_chars')
            });
            return;
        }

        this.window.setTitle(file.name);
        this.setCurrentFile(file);

        // This has to be done as the content of the file is only read by this
        // function (speeds up the process of refreshing the file tree)
        // ^-- ??? What did I mean by that comment?
        this.ipc.send('paths-update', this.paths);
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
            curdir = this.paths.findDir({'hash': arg.hash });
        } else {
            curdir = this.getCurrentDir();
        }

        this.watchdog.ignoreNext('addDir', path.join(curdir.path, arg.name));
        dir = curdir.newdir(arg.name);

        // If the user ONLY decided to use special chars
        // or did not input anything abort the process.
        if(dir == null) {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.could_not_create_dir'),
                message: trans('system.error.no_allowed_chars')
            });
            return;
        }

        // Re-render the directories, and then as well the file-list of the
        // current folder.
        this.ipc.send('paths-update', this.paths);

        // Switch to newly created directory.
        this.setCurrentDir(dir);
    }

    /**
     * Open a new root
     */
    openDir()
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

        // ret now contains the path. So let's add it.
        if(isFile(ret)) {
            this._openPaths.push(new ZettlrFile(this, ret))
        } else if(isDir(ret)) {
            this._openPaths.push(new ZettlrDir(this, ret));
        }

        // Sorta sort this out
        this._sortPaths();

        this.getConfig().addPath(ret);

        // Send the updated paths with the new path
        this.ipc.send('paths-update', this.getPaths());
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

        let file = this.paths.findFile({'hash': hash });

        if(!this.window.confirmRemove(file)) {
            return;
        }

        // Now that we are save, let's move the current file to trash.
        if(this.getCurrentFile() && (file.hash == this.getCurrentFile().hash)) {
            this.ipc.send('file-close', {});
            // Also re-set the title!
            this.window.setTitle();
        }
        file.remove();
        this.ipc.send('paths-update', this.paths);
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

        dir = this.paths.findDir({'hash': hash });

        if(filedir == dir) {
            if(!this.canClose()) {
                return;
            }
        }

        // No, you will NOT delete the root directory! :O
        if(dir.path == this.config.get('projectDir')) {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.delete_root_title'),
                message: trans('system.error.delete_root_message')
            });
            return;
        }

        if(!this.window.confirmRemove(dir)) {
            return;
        }

        // Now that we are save, let's move the current directory to trash.
        if(filedir == dir) {
            this.ipc.send('file-close', {});
        }

        if(dir == this.getCurrentDir()) {
            this.setCurrentDir(dir.parent); // Move up one level
        }

        this.watchdog.ignoreNext('unlinkDir', dir.path);
        dir.remove();

        this.ipc.send('paths-update', this.paths);
    }

    /**
     * Export a file to another format. DEPRECATED: This function will be
     * moved into another class in further versions.
     * @param  {Object} arg An object containing hash and wanted extension.
     * @return {void}     Does not return.
     * @deprecated
     */
    exportFile(arg)
    {
        if(!this.config.getEnv('pandoc')) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.no_pandoc_title'),
                message: trans('system.error.no_pandoc_message')
            });
        }

        if((arg.ext == 'pdf') && !this.config.getEnv('pdflatex')) {
            return this.window.prompt({
                type: 'error',
                title: trans('system.error.no_pdflatex_title'),
                message: trans('system.error.no_pdflatex_message', error)
            });
        }

        // arg contains a hash and an extension.
        let file = this.paths.findFile({ 'hash': arg.hash });
        let newname = file.name.substr(0, file.name.lastIndexOf(".")) + "." + arg.ext;
        let temp = app.getPath('temp');

        if(arg.ext == "pdf") {
            arg.ext = 'latex';
        }
        let tpl = path.join(this.config.getEnv('templateDir'), 'template.' + arg.ext);
        if(arg.ext === "html" || arg.ext === 'latex') {
            tpl = '--template="' + tpl + '"';
        } else if(arg.ext === 'odt' || arg.ext === 'docx') {
            tpl = '--reference-doc="' + tpl + '" -s'; // Don't forget standalone flag
        }

        let tempfile = path.join(temp, newname);

        let command = `pandoc "${file.path}" -f markdown ${tpl} -t ${arg.ext} -o "${tempfile}"`;

        // Set the current working directory of pandoc to temp. Failing to do so
        // will yield errors on Windows when the app is installed for all users
        // (because then the application directory will require admin rights to
        // write files to and pandoc spits out pre-rendered tex-files)
        exec(command, { 'cwd': app.getPath('temp')}, (error, stdout, stderr) => {
            if (error) {
                this.window.prompt({
                    type: 'error',
                    title: trans('system.error.pandoc_error_title'),
                    message: trans('system.error.pandoc_error_message', error)
                });
                return;
            }

            // Open externally
            require('electron').shell.openItem(tempfile);
        });
    }

    /**
     * Renames a directory.
     * @param  {Object} arg An object containing a hash.
     * @return {void}     This function does not return anything.
     */
    renameDir(arg)
    {
        // { 'hash': hash, 'name': val }
        let dir = this.paths.findDir({ 'hash': arg.hash});

        if(dir === this.paths) {
            // Don't rename the root directory
            this.window.prompt({
                type: 'error',
                title: trans('system.error.rename_root_title'),
                message: trans('system.error.rename_root_message')
            });
            return;
        }

        let oldDir = path.dirname(dir.path);

        // Save for later whether this is the currentDir (have to re-send dir list)
        let isCurDir = (dir.hash == this.getCurrentDir().hash) ? true : false;
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
        try {
            dir.move(oldDir, arg.name);
        } catch(e) {
            console.error(e);
        }
        this.ipc.send('paths-update', this.paths);

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
            file.rename(arg.name);
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
            file = this.paths.findFile({'hash': arg.hash});
            file.rename(arg.name); // Done.
        }

        // Is renamed file in displayed directory?
        if(this.getCurrentDir().findFile({ 'hash': file.hash}) !== null) {
            this.ipc.send('paths-update', this.paths);
        }
    }

    /**
     * Move a directory or a file.
     * @param  {Object} arg An object containing the hash of source and destination
     * @return {void}     This function does not return anything.
     */
    requestMove(arg)
    {
        // arg contains from and to
        let from = this.paths.findDir({ 'hash': arg.from });
        if(from == null) {
            // Obviously a file!
            from = this.paths.findFile({ 'hash': arg.from });
        }

        let to = this.paths.findDir({ 'hash': arg.to });

        // Let's check that:
        if(from.contains(to)) {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.move_into_child_title'),
                message: trans('system.error.move_into_child_message')
            });
            return;
        }

        // Now check if there already is a directory/file with the same name
        if(to.hasChild({ 'name': from.name })) {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.already_exists_title'),
                message: trans('system.error.already_exists_message', from.name)
            });
            return;
        }

        let newPath = null;
        let isCurDir = (from.hash == this.getCurrentDir().hash) ? true : false;

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
            this.ipc.send('paths-update', this.paths);
            this.ipc.send('file-set-current', from); // TODO: I _think_ this message is unnecessary.
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

        if(isCurDir) {
            this.ipc.send('dir-set-current', this.getCurrentDir());
        }

        if(newPath != null) {
            // Re-set current file in the client
            let nfile = from.findFile({ 'hash': newPath});
            this.setCurrentFile(nfile);
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
        this.resetCurrents();
    }

    /**
     * Reset the current pointers to initial values.
     * @return {void} This function does not return.
     */
    resetCurrents()
    {
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
     * Notify the renderer process of an available update.
     * @param  {String} newVer           The newest available version
     * @param  {String} message          The message, i.e. the changelog
     * @param  {String} releaseURL       URL to the release page on GitHub
     * @param  {String} [downloadURL=''] Optionally a URL to the install file
     */
    notifyUpdate(newVer, message, releaseURL, downloadURL = '')
    {
        this.ipc.send('update-available', {
            'newVer': newVer,
            'changelog': message,
            'releaseURL': releaseURL,
            'downloadURL': downloadURL
        });
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
        if(file == null) {
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
            file = this.getCurrentDir().newfile();
            this.watchdog.ignoreNext('add', file.path);
        } else {
            let f = null;
            for(let p of this.getPaths()) {
                f = p.findFile({ 'hash': file.hash });
                if(f != null) {
                    break;
                }
            }
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

        // Switch to newly created file (only happens before a file is selected)
        if(this.getCurrentFile() == null) {
            this.setCurrentFile(file);
            // "Open" this file.
            this.sendFile(file.hash);
        }

        if(this.getCurrentDir().contains(file)) {
            this.ipc.send('paths-update', this.getPaths());
        }
    }

    /**
     * Closes an open file/dir if the hashes match
     * @param  {Number} hash The hash to be closed
     */
    close(hash)
    {
        for(let p of this.getPaths()) {
            console.log(`checking for closing of ${p.getPath()}`);
            if(p.getHash() == hash) {
                console.log(`Closing root ${p.getPath()}!`);
                this.getConfig().removePath(p.getPath());
                this.getPaths().splice(this.getPaths().indexOf(p), 1);
                this.ipc.send('paths-update', this.getPaths());
                break;
            }
        }
    }

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
        this.ipc.send('file-set-current', f);
    }

    /**
     * Sets the current directory.
     * @param {ZettlrDir} d Directory to be selected.
     */
    setCurrentDir(d)
    {
        // Set the dir
        this.currentDir = d;
        this.ipc.send('dir-set-current', d);
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
