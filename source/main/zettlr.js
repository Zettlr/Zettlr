/* Zettlr Main Project file class. */

/*
WHAT THIS FILE DOES

This is the main hub for everything that the main
process does. This means that here everything comes together.
Creation of browser window etc. will all be done here.

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
const ZettlrWatchdog                = require('./zettlr-watchdog.js');
const {i18n, trans}                 = require('../common/lang/i18n.js');

class Zettlr
{
    constructor(parentApp)
    {
        // INTERNAL VARIABLES
        this.paths = null;            // All directories and md files, as objects
        this.currentFile = null;    // Currently opened file (object)
        this.currentDir = null;     // Current working directory (object)
        this.editFlag = false;      // Is the current opened file edited?

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
        // Initiate the directory tree
        this.paths = new ZettlrDir(this, this.config.get('projectDir'));

        // set currentDir pointer to the root node.
        this.currentDir = this.paths;

        // And the window.
        this.window = new ZettlrWindow(this);
        this.openWindow();

        // Last: Start watching the directory
        this.watchdog = new ZettlrWatchdog(this.config.get('projectDir'));
        this.watchdog.start();

        // Initiate regular polling
        setTimeout(() => {
            this.poll();
        }, 5000);
    }

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
                    f = based.addChild(p);
                    this.ipc.send('file-insert', f);
                    break;

                    case 'change':
                    if(f == this.getCurrentFile()) {
                        let ret = this.window.askReplaceFile();
                        // 1 = do it, 0 = don't
                        if(ret == 1) {
                            this.clearModified();
                            this.ipc.send('file-close', {});
                            this.ipc.send('file-open', f.withContent());
                        }
                    } else {
                        this.ipc.send('notify', `File ${f.name} changed remotely.`);
                    }
                    break;

                    case 'unlink':
                    if(f == null) { // Happens on move
                        break;
                    }
                    f.remove();
                    this.ipc.send('notify', `File ${f.name} has been removed.`);
                    this.ipc.send('file-pluck', f.hash); // Remove the file from client
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
                        this.ipc.send('dir-list', this.paths);
                    } // Else: Silently fail
                    break;

                    case 'unlinkDir':
                    if(d != null) {
                        d.remove();
                        this.ipc.send('dir-list', this.paths);
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
        }
        setTimeout(() => { this.poll(); }, 5000);
    }

    // Shutdown the app. This function is called on quit.
    shutdown()
    {
        this.config.save();
        this.watchdog.stop();
    }

    // Returns false if the file should not close, and true if it's safe.
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

    // This function is mainly called by the browser window to close the app.
    saveAndClose()
    {
        if(this.canClose()) {
            // Remember to clear the editFlag because otherwise the window
            // will refuse to close itself
            this.clearModified();
            app.quit();
        }
    }

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

    handleEvent(event, arg)
    {
        // We received a new event and need to handle it. This function is
        // called by the ZettlrIPC-object.
        switch(arg.command) {
            case 'get-paths':
            // The child process requested the current paths and files
            this.ipc.send('paths', this.getPaths());
            break;

            case 'file-get-quicklook':
            this.ipc.send('file-quicklook', this.paths.findFile({'hash': arg.content}).withContent());
            break;

            case 'file-get':
            // The client requested a different file.
            this.sendFile(arg.content);
            break;

            case 'get-file-list':
            // The client requested a new directory.
            this.sendFileList(arg.content);
            break;

            case 'file-modified':
            // Just set the modification flags.
            this.setModified();
            break;

            case 'file-new':
            // Client has requested a new file.
            this.newFile(arg.content);
            break;

            case 'dir-new':
            // Client has requested a new folder.
            this.newDir(arg.content);
            break;

            case 'file-save':
            // Client has requested a save-action.
            // arg contains the contents of CM and maybe also a hash.
            this.saveFile(arg.content);
            break;

            case 'dir-open':
            // Client requested a totally different folder.
            this.openDir();
            break;

            case 'file-delete':
            if(arg.content.hasOwnProperty('hash')) {
                this.removeFile(arg.content.hash);
            } else if(this.getCurrentFile() != null) {
                this.removeFile();
            }
            break;

            case 'dir-delete':
            if(arg.content.hasOwnProperty('hash')) {
                this.removeDir(arg.content.hash);
            } else if(this.getCurrentDir() != null) {
                this.removeDir();
            }
            break;

            case 'file-search':
            // arg.content contains a hash of the file to be searched
            // and the prepared terms.
            let ret = this.paths.findFile({ 'hash': arg.content.hash }).search(arg.content.terms);
            this.ipc.send('file-search-result', {
                'hash'  : arg.content.hash,
                'result': ret
            });
            break;

            // Change theme in config
            case 'toggle-theme':
            this.config.set('darkTheme', !this.config.get('darkTheme'));
            break;

            // Change snippet setting in config
            case 'toggle-snippets':
            this.config.set('snippets', !this.config.get('snippets'));
            break;

            case 'export':
            this.exportFile(arg.content);
            break;

            // Rename a directory (arg.hash + arg.(new)name)
            case 'dir-rename':
            this.renameDir(arg.content);
            break;

            case 'file-rename':
            this.renameFile(arg.content);
            break;

            // Client requested a directory move
            case 'request-move':
            this.requestMove(arg.content);
            break;

            case 'get-preferences':
            // Duplicate the object because we only need supportedLangs for the
            // renderer
            let toSend = JSON.parse(JSON.stringify(this.config.config));
            toSend.supportedLangs = this.config.getSupportedLangs();
            this.ipc.send('preferences', toSend);
            break;

            // Got a new config object
            case 'update-config':
            // Immediately reflect snippets and theme
            if(arg.content.darkTheme != this.config.get('darkTheme')) {
                this.ipc.send('toggle-theme', 'no-emit');
            }
            if(arg.content.snippets != this.config.get('snippets')) {
                this.ipc.send('toggle-snippets', 'no-emit');
            }
            this.config.update(arg.content);
            break;

            // Renderer wants a configuration value
            case 'config-get':
            this.ipc.send('config', { 'key': arg.content, 'value': this.config.get(arg.content) });
            break;

            case 'config-get-env':
            this.ipc.send('config', { 'key': arg.content, 'value': this.config.getEnv(arg.content) });
            break;

            // SPELLCHECKING EVENTS
            case 'typo-request-lang':
            this.ipc.send('typo-lang', this.config.get('spellcheck'));
            break;

            case 'typo-request-aff':
            this.retrieveDictFile('aff', arg.content);
            break;

            case 'typo-request-dic':
            this.retrieveDictFile('dic', arg.content);
            break;

            default:
            console.log(trans('system.unknown_command', arg.command));
            break;
        }
    }

    sendFile(arg)
    {
        if(!this.canClose()) {
            return;
        }

        // arg contains the hash of a file.
        // getFile now returns the file object
        let file = this.paths.findFile({ 'hash': arg });

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

    // Send a new directory list to the client.
    sendFileList(arg)
    {
        // arg contains a hash for a directory.
        let obj = this.paths.findDir({ 'hash': arg });

        // Now send it back (the GUI should by itself filter out the files)
        if(obj != null && obj.isDirectory()) {
            this.setCurrentDir(obj);
            this.ipc.send('file-list', obj);
            this.ipc.send('dir-set-current', obj);
        }
        else {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.dnf_title'),
                message: trans('system.error.dnf_message')
            });
        }
    }

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
        this.ipc.send('file-open', file.withContent());
        this.ipc.send('file-list', this.getCurrentDir()); // in "dir" the new file is not yet present.
        this.ipc.send('dir-set-current', this.getCurrentDir());
    }

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

        // Switch to newly created directory.
        this.setCurrentDir(dir);

        // Re-render the directories, and then as well the file-list of the
        // current folder.
        this.ipc.send('paths', this.paths);
        this.ipc.send('file-list', dir);
        this.ipc.send('dir-set-current', dir);
    }

    openDir()
    {
        // The user wants to open a different folder.
        // First check if the document is edited. If yes, ask user to save beforehand.
        if(!this.canClose()) {
            return;
        }

        // In case of ret == 2 just proceed with opening another file
        let ret = this.window.askDir(this.getCurrentDir().path);

        // The user may have provided no dir at all, which returns in an
        // empty array -> check against and abort if array is empty
        if(!(ret && ret.length)) {
            return;
        }

        // Ret is now an array. As we do not allow multiple selection, just
        // take the first index.
        ret = ret[0];

        // ret now contains the path. So let's alter configuration and reload.
        this.reload(ret);

        // The client now needs to close the current file and refresh its list
        this.ipc.send('file-close');
        this.ipc.send('paths', this.getPaths());
    }

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
        this.ipc.send('file-list', this.getCurrentDir());
        this.ipc.send('dir-set-current', this.getCurrentDir());
    }

    // Remove current directory.
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

        // BUG: When these two events are fired in reverse order the child
        // process freezes.
        this.ipc.send('file-list', this.getCurrentDir());
        this.ipc.send('dir-list', this.paths);
    }

    exportFile(arg)
    {
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

        let command = `${this.config.get('pandoc')} "${file.path}" -f markdown ${tpl} -t ${arg.ext} -o "${tempfile}"`;

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
            oldPath = this.getCurrentFile().hashPath(oldPath); // Misuse hashing function :D
        }

        // Move to same location with different name
        try {
            dir.move(oldDir, arg.name);
        } catch(e) {
            console.error(e);
        }
        // Send new directory list
        this.ipc.send('dir-list', this.paths);
        this.ipc.send('update-paths', this.paths);

        // Refresh file list with new hashes
        if(isCurDir) {
            this.ipc.send('file-list', dir);
            this.ipc.send('set-current-dir', dir);
        }

        if(oldPath != null) {
            // Re-set current file in the client
            let nfile = dir.findFile({ 'hash': oldPath });
            this.setCurrentFile(nfile);
            this.ipc.send('file-set-current', nfile);
        }
    }

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
                title = "*" + this.getCurrentFile().name + " — Zettlr";
            } else {
                title = this.getCurrentFile().name + " — Zettlr";
            }

            this.window.setTitle(title);
        } else {
            // Non-open file should be renamed.
            file = this.paths.findFile({'hash': arg.hash});
            file.rename(arg.name); // Done.
        }

        // Is renamed file in displayed directory?
        if(this.getCurrentDir().findFile({ 'hash': file.hash}) !== null) {
            // Send a new file list
            this.ipc.send('file-list', this.getCurrentDir());
        }
    }

    // Move a directory or file
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
        if(from.isDirectory() && from.contains(to)) {
            this.window.prompt({
                type: 'error',
                title: trans('system.error.move_into_child_title'),
                message: trans('system.error.move_into_child_message')
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
            this.ipc.send('dir-set-current', to);
            this.ipc.send('file-list', to);
            this.ipc.send('file-set-current', from);
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

        if(from.isDirectory()) {
            // Send new directory list
            this.ipc.send('dir-list', this.paths);
        }

        if(from.isFile()) {
            // Yes, it's a file, but no, not the current. So just repaint files
            // TODO: Being able to pluck or push files and dirs would ease everything
            this.ipc.send('file-list', this.getCurrentDir());
        }

        if(isCurDir) {
            this.ipc.send('dir-set-current', from); // The client doesn't have the same object reference
            // And, just in case, new directory list
            this.ipc.send('file-list', this.getCurrentDir());
        }

        if(newPath != null) {
            // Re-set current file in the client
            let nfile = from.findFile({ 'hash': newPath});
            this.setCurrentFile(nfile);
            this.ipc.send('file-set-current', nfile);
        }
    }

    // SPELLCHECKING RELATED FUNCTIONS
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

    // This reloads the path list - is e.g. called after the creation of a new
    // file or a new directory or saving or renaming of a file.
    refreshPaths()
    {
        // Just create a new ZettlrDir. Garbage Collect will destroy the old.
        this.paths = new ZettlrDir(this, this.config.get('projectDir'));
    }

    // This function is called when the window is destroyed to remove pointers
    // This does NOT reload the paths!
    resetCurrents()
    {
        this.currentDir = this.paths;
        this.currentFile = null;
    }

    // Save a file. A file MUST be given, for the content is needed to write to
    // a file. The content is always freshly grabbed from the CodeMirror content.
    saveFile(file)
    {
        if(file == null) {
            // No file given -> abort saving process
            return;
        }

        let cnt = file.content;

        // This function saves a file to disk.
        // But: The hash is "null", if someone just
        // started typing with no file open.
        if(!file.hasOwnProperty('hash') || file.hash == null) {
            // For ease create a new file in current directory.
            file = this.getCurrentDir().newfile();
            this.watchdog.ignoreNext('add', file.path);
        } else {
            file = this.paths.findFile({ 'hash': file.hash });
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
            this.sendFileList(this.getCurrentDir().hash);
            this.sendFile(file.hash);
            return;
        }
        if(this.getCurrentDir().contains(file)) {
            // Send new file list to reflect changes at the beginning of a file.
            this.ipc.send('file-list', this.getCurrentDir());
        }
    }

    // Setters - to be triggered from IPC process
    // Set current file pointer
    setCurrentFile(f)
    {
        if(f == null) {
            // Dereference
            this.currentFile = null;
            return;
        }

        if(this.window != null) {
            this.window.setTitle(f.name);
        }
        this.currentFile = f;
    }

    // Set current dir pointer
    setCurrentDir(f)
    {
        if(f == null) {
            // Reset to project root
            this.currentDir = this.getPaths();
            return;
        }
        // Set the dir
        this.currentDir = f;
    }

    setModified()
    {
        this.window.setModified();
        this.editFlag = true;
    }

    // Remove modified flag
    clearModified()
    {
        this.window.clearModified();
        this.editFlag = false;
    }

    // Getters
    getWindow()      { return this.window; }
    getPaths()       { return this.paths; }
    getCurrentDir()  { return this.currentDir; }
    getCurrentFile() { return this.currentFile; }

    // This is used by the root directory to safely determine whether it is root
    isDirectory()    { return false; }
    isModified()     { return this.editFlag; }

    openWindow()     { this.window.open(); }
    closeWindow()    { this.window.close(); }
}

// Export the module on require()
module.exports = Zettlr;
