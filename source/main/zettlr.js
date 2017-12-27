/* Zettlr Main Project file class. */

/*
WHAT THIS FILE DOES

This is the main hub for everything that the main
process does. This means that here everything comes together.
Creation of browser window etc. will all be done here.

*/

const {dialog, app, BrowserWindow} = require('electron');
const fs = require('fs');
const process = require('process');
const path = require('path');
const commandExists = require('command-exists').sync; // Does a given shell command exist?
const {exec} = require('child_process');

// Internal classes
const ZettlrIPC = require('./zettlr-ipc.js');
const ZettlrWindow = require('./zettlr-window.js');
const ZettlrConfig = require('./zettlr-config.js');
const ZettlrDir = require('./zettlr-dir.js');

function Zettlr(parentApp)
{
    // INTERNAL VARIABLES
    this.paths = null;            // All directories and md files, as objects

    this.currentFile = null;    // Currently opened file (object)
    this.currentDir = null;     // Current working directory (object)
    this.editFlag = false;      // Is the current opened file edited?
    this.pandoc = false;        // Is pandoc present on this system?
    this.pdflatex = false;      // Is pdflatex present here? (for PDF-exports)

    // INTERNAL OBJECTS
    this.window = null;         // Display content
    this.ipc = null;            // Communicate with said content
    this.app = parentApp;       // Internal pointer to app object
    this.config = null;         // Configuration file handler

    // CLASS FUNCTIONS
    this.init;                  // Initialize app
    this.openWindow;            // Opens a window.
    this.closeWindow;           // Closes the current window
    this.canClose;              // Determines whether or not we can close the window
    this.reload;                // Reload the whole app

    this.handleEvent;           // Gets called whenever ZettlrIPC receives a message

    this.refreshPaths;          // Reload paths-object
    this.resetCurrents;         // Reset currentFile/currentDir-pointers

    this.createFile;            // Create a new file
    this.createDir;             // Create a new folder

    this.saveFile;              // Save a file
    this.removeFile;            // Delete a file
    this.removeDir;             // Delete a directory

    this.getWindow;             // Returns the ZettlrWindow
    this.getPaths;              // Retrieve the paths-object
    this.getObject;             // Retrieve a dir/file-object from paths tree
    this.getFile;               // Retrieve a file's contents from disk
    this.getCurrentDir;         // Retrieve current directory object
    this.getCurrentFile;        // Retrieve current file object
    this.getProjectDir;         // Retrieve path to root directory

    this.setCurrentFile;        // Change current file
    this.setCurrentDir;         // Change current dir

    this.isModified;            // Is the opened file modified?
    this.setModified;           // Mark the current document as modified
    this.clearModified;         // Clear modification status

    // This function will be called once the app is ready.
    this.init = function() {
        // Load config
        this.config = new ZettlrConfig(this);
        this.config.init();

        // Initiate the files - every dir will read its own contents.
        this.paths = new ZettlrDir(this, this.config.get('projectDir'));

        // set currentDir pointer to the root node. We can traverse by using
        // "parent" and "children[]" on each dir (and file)
        this.currentDir = this.paths;

        // Everything should be in the respective arrays by now.
        // So create the communications array
        this.ipc = new ZettlrIPC(this);
        // Activate event listeners
        this.ipc.init();

        // And the window.
        this.window = new ZettlrWindow(this);
        this.openWindow();

        // Check pandoc availability (general exports)
        if(commandExists(this.config.get('pandoc'))) {
            this.pandoc = true;
        }

        // Check PDFLaTeX availability (PDF exports)
        if(commandExists(this.config.get('pdflatex'))) {
            this.pdflatex = true;
        }
    }; // END init

    // Create new window.
    this.openWindow = function() {
        this.window.open();
    };

    // Dereference the window
    this.closeWindow = function() {
        this.window.close();
    };

    // Gets called by ZettlrWindow for after-start tasks
    this.afterWindowStart = function() {
        // Now eventually switch the theme to dark
        if(this.config.get('darkTheme')) {
            this.ipc.send('toggle-theme', 'no-emit'); // Don't send that back to me!
        }

        // Default is: Show snippets
        if(!this.config.get('snippets')) {
            this.ipc.send('toggle-snippets');
        }

        // Send found binaries from init() to the client
        this.ipc.send('binaries', { 'pandoc': this.pandoc, 'pdflatex': this.pdflatex });
    };

    // Shutdown the app. This function is called on quit.
    this.shutdown = function() {
        this.config.save();
    };

    // Returns false if the window should not close, and true if it's safe.
    this.canClose = function() {
        return !this.isModified();
    };

    // This function is mainly called by the browser window to close the app.
    this.saveAndClose = function() {
        ret = this.window.askSaveChanges();

        // User wants to abort close
        if(ret == 0) {
            return;
        }

        // User wants to save first.
        if(ret == 1) {
            // So let us save. Obviously, the current file, so don't provide
            // an argument.
            this.ipc.send('save-file', {});
            return;
        }

        // User wants to omit changes and close anyway on ret = 2
        // IMPORTANT: As we did not save the file, the window will not close
        // because we have not cleared the "isModified"-flag.
        this.clearModified();
        app.quit();
    };

    this.reload = function(newPath = null) {
        // The application has requested a full reload of the data because the
        // user wants to provide a new path. So basically perform everything in
        // init except loading the config file.
        if(newPath == null) {
            // Reload with current projectDir given.
            newPath = this.config.get('projectDir');
        }

        // Funny if a normal reload will be done, criss cross variable assignment ftw!
        this.config.set('projectDir', newPath);

        // Re-Read the paths
        this.refreshPaths();
        // And file pointers (e.g. begin at the root with no file open)
        this.resetCurrents();
    };

    /***************************************************************************
    **                                                                        **
    **                                                                        **
    **                                                                        **
    **                          BEGIN EVENT HANDLE EVENTS                     **
    **                                                                        **
    **                                                                        **
    **                                                                        **
    ***************************************************************************/

    this.handleEvent = function(event, arg) {
        // We received a new event and need to handle it. This function is
        // called by the ZettlrIPC-object.
        switch(arg.command) {
            case 'get-paths':
            // The child process requested the current paths and files
            this.ipc.send('paths', this.getPaths());
            break;

            case 'get-file':
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

            case 'new-file':
            // Client has requested a new file.
            this.newFile(arg.content);
            break;

            case 'new-dir':
            // Client has requested a new folder.
            this.newDir(arg.content);
            break;

            case 'save-file':
            // Client has requested a save-action.
            // arg contains the contents of CM and maybe also a hash.
            this.saveFile(arg.content);
            // Send new file list to reflect changes at the beginning of a file.
            this.ipc.send('file-list', this.getCurrentDir());
            break;

            case 'open-dir':
            // Client requested a totally different folder.
            this.openDir();
            break;

            case 'get-current-file-hash':
            // Easy: Just send the hash.
            this.ipc.send('current-file-hash', this.getCurrentFile().hash);
            break;

            case 'delete-file':
            if(arg.content.hasOwnProperty('hash')) {
                this.removeFile(arg.content.hash);
            } else if(this.getCurrentFile() != null) {
                this.removeFile();
            }
            break;

            case 'delete-dir':
            if(arg.content.hasOwnProperty('hash')) {
                this.removeDir(arg.content.hash);
            } else if(this.getCurrentDir() != null) {
                this.removeDir();
            }
            break;

            case 'search-file':
            // arg.content contains a hash of the file to be searched
            // and the prepared terms.
            ret = this.paths.findFile({ 'hash': arg.content.hash }).search(arg.content.terms);
            this.ipc.send('search-result', {
                'hash': arg.content.hash,
                'result': ret
            });
            break;

            // Change theme in config
            case 'toggle-theme':
            this.config.set("darkTheme", !this.config.get('darkTheme'));
            break;

            // Change snippet setting in config
            case 'toggle-snippets':
            this.config.set('snippets', !this.config.get('snippets'));
            break;

            case 'export':
            this.export(arg.content);
            break;

            // Rename a directory (arg.hash + arg.(new)name)
            case 'rename-dir':
            this.renameDir(arg.content);
            break;

            case 'rename-file':
            this.renameFile(arg.content);
            break;

            // Client requested a directory move
            case 'request-move':
            this.requestMove(arg.content);
            break;

            case 'get-preferences':
            this.ipc.send('preferences', this.config.config);
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

            default:
            console.log("Unknown command received: " + arg.command);
            break;
        }
    };

    this.sendFile = function(arg) {
        if(this.isModified()) {
            // The file is currently modified. Ask for saving.

            ret = this.window.askSaveChanges();

            // Cancel: abort opening a new file
            if(ret == 0) { return; }

            if(ret == 1) { // User wants to save the file first. -> Send save request and cancel closing
                this.ipc.send('save-file', arg);
                return;
                // TODO: Implement into the event arguments a "intent" of closing
            }

            // Mark as if nothing has been changed
            if(ret == 2) { this.clearModified(); }
        }

        // arg contains the hash of a file.
        // getFile now returns the file object
        file = this.paths.findFile({ 'hash': arg });

        if(file != null) {
            this.ipc.send('file', file.withContent());
            this.window.setTitle(file.name + ' — Zettlr');
            this.setCurrentFile(file);
        } else {
            this.window.prompt({
                type: 'error',
                title: 'File not found',
                message: 'The requested file was not found.'
            });
        }
    };

    // Send a new directory list to the client.
    this.sendFileList = function(arg) {
        // arg contains a hash for a directory.
        obj = this.paths.findDir({ 'hash': arg });

        // Now send it back (the GUI should by itself filter out the files)
        if(obj != null && obj.isDirectory()) {
            this.setCurrentDir(obj);
            this.ipc.send('file-list', obj);
            this.ipc.send('set-current-dir', obj);
        }
        else {
            this.window.prompt({
                type: 'error',
                title: 'Folder not found',
                message: 'The requested folder was not found.'
            });
        }
    };

    this.newFile = function(arg) {
        // If the user ONLY decided to use special chars
        // or did not input anything abort the process.
        if(this.isModified()) {
            // The file is currently modified. Ask for saving.

            ret = this.window.askSaveChanges();

            // Cancel: abort opening a new file
            if(ret == 0) { return; }

            if(ret == 1) { // User wants to save the file first. -> Send save request and cancel closing
                this.ipc.send('save-file', arg);
                return;
                // TODO: Implement into the event arguments a "intent" of closing
            }

            // Mark as if nothing has been changed
            if(ret == 2) { this.clearModified(); }
        }

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
                title: 'Could not create file',
                message: 'This file already exists.'
            });
            return;
        }
        file = dir.newfile(arg.name);

        // This gets executed if arg contained no allowed chars, so warn.
        if(file == null) {
            this.window.prompt({
                type: 'error',
                title: 'Could not create file',
                message: 'The provided file name did not contain any allowed characters.'
            });
            return;
        }

        this.window.setTitle(file.name + ' — Zettlr');
        this.setCurrentFile(file);

        // This has to be done as the content of the file is only read by this
        // function (speeds up the process of refreshing the file tree)
        this.ipc.send('file', file.withContent());
        this.ipc.send('file-list', this.getCurrentDir()); // in "dir" the new file is not yet present.
        this.ipc.send('set-current-dir', this.getCurrentDir());
    };

    this.newDir = function(arg) {

        if(arg.hasOwnProperty('hash')) {
            curdir = this.paths.findDir({'hash': arg.hash });
        } else {
            curdir = this.getCurrentDir();
        }

        dir = curdir.newdir(arg.name);

        // If the user ONLY decided to use special chars
        // or did not input anything abort the process.
        if(dir == null) {
            this.window.prompt({
                type: 'error',
                title: 'Empty directory name',
                message: 'The provided name did not contain any allowed characters.'
            });
            return;
        }

        // Switch to newly created directory.
        this.setCurrentDir(dir);

        // Re-render the directories, and then as well the file-list of the
        // current folder.
        this.ipc.send('paths', this.paths);
        this.ipc.send('file-list', dir);
        this.ipc.send('set-current-dir', dir);
    };

    this.openDir = function() {
        // The user wants to open a different folder.
        // First check if the document is edited. If yes, ask user to save beforehand.
        if(this.isModified()) {
            ret = this.window.askSaveChanges();
            if(ret == 0) { // Cancel: abort action
                return;
            }

            if(ret == 1) { // User wants to save the file first. -> Send save request and abort
                this.ipc.send('save-file', { 'intent': 'open-dir' });
                return;
            }

            if(ret == 2) {
                this.clearModified();
            }
        }

        // In case of ret == 2 just proceed with opening another file
        ret = this.window.askDir(this.getCurrentDir().path);

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
        this.ipc.send('close-file');
        this.ipc.send('paths', this.getPaths());
    };

    this.removeFile = function(hash = this.getCurrentFile().hash) {
        // First determine if this is modified.
        if(this.isModified()) {
            ret = this.window.askSaveChanges();

            if(ret == 0) { return; }

            if(ret == 1) { // User wants to save the file first. -> Send save request and abort
                this.ipc.send('save-file', { 'intent': 'delete-file'});
                return;
            }
        }

        file = this.paths.findFile({'hash': hash });

        // TODO: Ask if the user REALLY wants to move file to trash.
        if(!this.window.confirmRemove(file)) {
            return;
        }

        // Now that we are save, let's move the current file to trash.
        if(file.hash == this.getCurrentFile().hash) {
            this.ipc.send('close-file', {});
            this.clearModified();
        }
        let that = this;
        file.remove();
        this.ipc.send('file-list', this.getCurrentDir());
        this.ipc.send('set-current-dir', this.getCurrentDir());
    };

    // Remove current directory.
    this.removeDir = function(hash = this.getCurrentDir().hash) {
        // First determine if this is modified.
        if(this.getCurrentFile() == null) {
            filedir = '';
        } else {
            filedir = this.getCurrentFile().parent; // Oh I knew this would be clever :>
        }

        dir = this.paths.findDir({'hash': hash });

        if(this.isModified() && (filedir == dir)) {
            ret = this.window.askSaveChanges();

            if(ret == 0) { // Cancel: abort action
                return;
            }

            if(ret == 1) { // User wants to save the file first. -> Send save request and abort
                // Now we are trying the intent for the first time. If it works out
                // TODO: implement in all of these save-thingy-stuff-shit. Blah.
                this.ipc.send('save-file', { 'intent': 'delete-dir'});
                return;
            }
        }

        // No, you will NOT delete the root directory! :O
        if(dir.path == this.getProjectDir()) {
            this.window.prompt({
                type: 'error',
                title: 'Cannot delete root folder.',
                message: 'You cannot delete the root folder.'
            });
            return;
        }

        if(!this.window.confirmRemove(dir)) {
            return;
        }

        // Now that we are save, let's move the current directory to trash.
        if(filedir == dir) {
            this.ipc.send('close-file', {});
        }

        if(dir == this.getCurrentDir()) {
            this.setCurrentDir(dir.parent); // Move up one level
        }

        dir.remove();
        this.clearModified();

        // BUG: When these two events are fired in reverse order the child
        // process freezes.
        this.ipc.send('file-list', this.getCurrentDir());

        this.ipc.send('dir-list', this.paths);
    };

    this.export = function(arg) {
        // arg contains a hash and an extension.
        file = this.paths.findFile({ 'hash': arg.hash });
        newname = file.name.substr(0, file.name.lastIndexOf(".")) + "." + arg.ext;
        temp = app.getPath('temp');

        if(arg.ext == "pdf") {
            arg.ext = 'latex';
        }
        let tpl = path.join(this.getTemplateDir(), 'template.' + arg.ext);
        if(arg.ext === "html" || arg.ext === 'latex') {
            tpl = '--template="' + tpl + '"';
        } else if(arg.ext === 'odt' || arg.ext === 'docx') {
            tpl = '--reference-doc="' + tpl + '" -s'; // Don't forget standalone flag
        }

        let tempfile = path.join(temp, newname);

        // We have the problem that pandoc version 2 does not recognize pdflatex
        // given with the --pdf-engine command. It does work, though, if it finds
        // it in path. So instead of passing it directly, let us just insert it into
        // electron's PATH
        if(path.dirname(this.config.get('pdflatex')).length > 0) {
            // In the config the user saved a whole path, so obviously pandoc
            // did not see pdflatex -> insert into path
            if(process.env.PATH.indexOf(path.dirname(this.config.get('pdflatex'))) == -1) {
                process.env.PATH = process.env.PATH + ':' + path.dirname(this.config.get('pdflatex'));
                console.log(process.env.PATH);
            }
        }
        command = `${this.config.get('pandoc')} "${file.path}" -f markdown ${tpl} -t ${arg.ext} -o "${tempfile}"`;

        let that = this;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                that.window.prompt({
                    type: 'error',
                    title: 'Error on exporting',
                    message: 'Pandoc reported an error: ' + error
                });
                return;
            }

            // Open externally
            require('electron').shell.openItem(tempfile);
        });
    };

    this.renameDir = function(arg) {
        // { 'hash': hash, 'name': val }
        dir = this.paths.findDir({ 'hash': arg.hash});

        if(dir === this.paths) {
            // Don't rename the root directory
            this.window.prompt({
                type: 'error',
                title: 'Cannot rename root',
                message: 'You cannot rename the root directory.'
            });
            return;
        }

        oldDir = path.dirname(dir.path);

        // Save for later whether this is the currentDir (have to re-send dir list)
        isCurDir = (dir.hash == this.getCurrentDir().hash) ? true : false;
        let oldPath = null;

        if((this.getCurrentFile() !== null) && (dir.findFile(this.getCurrentFile().hash) !== null)) {
            // The current file is in said dir so we need to trick a little bit
            oldPath = this.getCurrentFile().path;
            relative = oldPath.replace(dir.path, ""); // Remove old directory to get relative path
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
            nfile = dir.findFile({ 'hash': oldPath});
            this.setCurrentFile(nfile);
            this.ipc.send('set-current-file', nfile);
        }
    };

    this.renameFile = function(arg) {
        // { 'hash': hash, 'name': val }
        let file = null;

        // Possibilities: Non-opened file or opened file
        if(this.getCurrentFile().hash == arg.hash) {
            // Current file should be renamed.
            file = this.getCurrentFile();
            file.rename(arg.name);
            // Set current file to reflect changes in hash
            this.ipc.send('set-current-file', file);

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
    };

    // TODO: Some slight glitches while moving
    this.requestMove = function(arg) {
        // arg contains from and to
        from = this.paths.findDir({ 'hash': arg.from });
        if(from == null) {
            // Obviously a file!
            from = this.paths.findFile({ 'hash': arg.from });
        }

        to = this.paths.findDir({ 'hash': arg.to });
        let newPath = null;
        isCurDir = (from.hash == this.getCurrentDir().hash) ? true : false;

        if(from.isFile() && (this.getCurrentFile() != null) && (from.hash == this.getCurrentFile().hash)) {
            // Current file is to be moved
            // So move the file and immediately retrieve the new path
            from.move(to.path);
            to.attach(from);

            // Now our current file has been successfully moved and will
            // save correctly. Problem? The client needs it as well.
            // We have to set current dir (the to-dir) and current file AND
            // select it.
            this.setCurrentDir(to); // Current file is still correctly set
            this.ipc.send('set-current-dir', to);
            this.ipc.send('file-list', to);
            this.ipc.send('set-current-file', from);
            return;
        } else if((this.getCurrentFile() !== null)
        && (from.findFile({ 'hash': this.getCurrentFile().hash }) !== null)) {
            // The current file is in said dir so we need to trick a little bit
            newPath = this.getCurrentFile().path;
            relative = newPath.replace(from.path, ""); // Remove old directory to get relative path
            // Re-merge:
            newPath = path.join(to.path, from.name, relative); // New path now
            // Hash it
            newPath = this.getCurrentFile().hashPath(newPath); // Misuse hashing function :D
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
            this.ipc.send('set-current-dir', from); // The client doesn't have the same object reference
            // And, just in case, new directory list
            this.ipc.send('file-list', this.getCurrentDir());
        }

        if(newPath != null) {
            // Re-set current file in the client
            nfile = from.findFile({ 'hash': newPath});
            this.setCurrentFile(nfile);
            this.ipc.send('set-current-file', nfile);
        }
    };

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
    this.refreshPaths = function() {

        // Just create a new ZettlrDir. Garbage Collect will destroy the old.
        this.paths = new ZettlrDir(this, this.config.get('projectDir'));
    };

    // This function is called when the window is destroyed to remove pointers
    // This does NOT reload the paths!
    this.resetCurrents = function() {
        // Set pointers to origin
        this.currentDir = this.paths;
        this.currentFile = null;
    };

    // Creators
    this.createFile = function(p, file) {
        // This function is triggered via menu (that sends an ipc event to main)
        // path contains either the base path (if no dir has been selected previously)
        // or the specified. This is not done in this function because the
        // call may come from menu item OR from a context menu (specifying an
        // even different folder.)

        // Make sure not to overwrite something
        if(this.paths.exists(path.join(p, file))) {
            return;
        }

        // Create an empty file
        // Therefore get the dir-object and create.
        d = this.paths.findDir({ 'path': p});

        if(d == null) {
            // No success
            this.window.prompt({
                type: 'error',
                title: 'Could not find folder',
                message: 'Could not find the folder in which the file should have been created!'
            });
            return null;
        }

        // ... and return the new file
        return d.newfile(file);
    };

    this.createDir = function(dir, foldername) {
        // Tries to create a folder.
        // Make sure not to overwrite something
        if(dir.exists(foldername)) {
            return null;
        }

        // ... and return the new folder
        return dir.newDir(foldername);
    }

    // Save a file. A file MUST be given, for the content is needed to write to
    // a file. The content is always freshly grabbed from the CodeMirror content.
    this.saveFile = function(file) {
        if(file == null) {
            // No file given -> abort saving process
            return;
        }

        cnt = file.content;

        // This function saves a file to disk.
        // But: The hash is "null", if someone just
        // started typing with no file open.
        if(file.hash == null) {
            // For ease create a new file in current directory.
            file = this.getCurrentDir().newfile();
        } else {
            file = this.paths.findFile({ 'hash': file.hash });
        }

        file.setContent(cnt);
        file.save();

        // Check if the filename differs from current path. If yes, set the current
        // file. This will then switch to the newly created file
        if(this.currentFile.hash != file.hash) {
            this.currentFile = file;
        }
        this.clearModified();
    };

    // Getters
    this.getWindow = function() {
        return this.window;
    }

    this.getPaths = function() {
        return this.paths;
    };

    this.getCurrentDir = function() {
        return this.currentDir;
    };

    this.getCurrentFile = function() {
        return this.currentFile;
    };

    this.getProjectDir = function() {
        return this.config.get('projectDir');
    };

    // This function returns the platform specific template dir for pandoc
    // template files. This is based on the electron-builder options
    // See https://www.electron.build/configuration/contents#extraresources
    // Quote: "Contents/Resources for MacOS, resources for Linux and Windows"
    this.getTemplateDir = function() {
        let dir = app.getPath('exe'); // dir is now path to the FILE
        dir = path.dirname(dir); // dir is now path to directory of executable

        if(process.platform === 'darwin') {
            // The executable lies in Contents/MacOS --> navigate up a second time
            dir = path.dirname(dir);

            // macos is capitalized "Resources", not "resources" in lowercase
            dir = path.join(dir, 'Resources');
        } else {
            dir = path.join(dir, 'resources');
        }

        return path.join(dir, 'pandoc');
    };

    // Setters - to be triggered from IPC process
    // Set current file pointer
    this.setCurrentFile = function(f) {
        if(f == null) {
            // Dereference
            this.currentFile = null;
            return;
        }
        // Find the file by hash
        this.currentFile = f;
    };

    // Set current dir pointer
    this.setCurrentDir = function(f) {
        if(f == null) {
            // Reset to project root
            this.currentDir = this.getPaths();
            return;
        }
        // Set the dir
        this.currentDir = f;
    };

    // MODIFICATION FUNCTIONS
    this.isModified = function() {
        return this.editFlag;
    }

    this.setModified = function() {
        this.window.setModified();
        return (this.editFlag = true);
    }

    // Remove modified flag
    this.clearModified = function() {
        this.window.clearModified();
        return this.editFlag = false;
    };
}

// Export the module on require()
module.exports = Zettlr;
