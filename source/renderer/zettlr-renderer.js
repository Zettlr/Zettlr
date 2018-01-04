/* Main Renderer */

// Enable communication with host process
const ZettlrRendererIPC = require('./zettlr-rendereripc.js');
const ZettlrDirectories = require('./zettlr-directories.js');
const ZettlrPreview = require('./zettlr-preview.js');
const ZettlrEditor = require('./zettlr-editor.js');
const ZettlrBody = require('./zettlr-body.js');

/* CLASS */
function ZettlrRenderer()
{
    this.ipc;
    this.directories;
    this.preview;
    this.editor;
    this.body;

    this.currentFile = null;
    this.currentDir = null;

    // Indicators whether or not one of these has been found
    this.pandoc = false;
    this.pdflatex = false;

    this.init = function()
    {
        this.ipc         = new ZettlrRendererIPC(this);
        this.directories = new ZettlrDirectories(this);
        this.preview     = new ZettlrPreview(this);
        this.editor      = new ZettlrEditor(this);
        this.body        = new ZettlrBody(this);

        // Now send the first request to main to ask for a initial file list
        this.ipc.send('get-paths', {});
    };

    this.handleEvent = function(event, arg) {
        switch(arg.command)
        {
            case 'paths':
            // arg contains a JSON with all paths and files
            // Set the currentDir to root, distribute tree to dirs and preview
            // and select the root. Initial command.
            this.setCurrentDir(arg.content);
            // Save for later
            this.paths = arg.content;
            this.directories.newDirectoryList(arg.content);
            this.preview.newFileList(arg.content);
            this.directories.select(arg.content.hash);
            break;

            case 'dir-list':
            // A directory was created or removed, so repaint.
            this.directories.newDirectoryList(arg.content);
            this.paths = arg.content;
            break;

            case 'file-list':
            // We have received a new file list in arg
            // Set the current dir
            // this.setCurrentDir(arg.content);
            // this.directories.select(arg.content.hash);
            this.preview.newFileList(arg.content);
            break;

            case 'set-current-dir':
            // Received a new directory
            this.setCurrentDir(arg.content);
            this.directories.select(arg.content.hash);
            break;

            case 'set-current-file':
            this.setCurrentFile(arg.content);
            this.preview.select(arg.content.hash);
            break;

            case 'file':
            // We have received a new file. So close the old and open the new
            this.editor.close();
            this.setCurrentFile(arg.content);
            this.preview.select(arg.content.hash);
            this.editor.open(arg.content);
            break;

            case 'close-file':
            // We have received a close-file command.
            this.editor.close();
            this.setCurrentFile(null);
            break;

            case 'save-file':
            // The user wants to save the currently opened file.
            file = this.getCurrentFile();
            file.content = this.editor.getValue();
            this.ipc.send('save-file', file);
            break;

            case 'find-file':
            this.editor.openFind();
            break;

            case 'find-dir':
            // User wants to search in current directory.
            this.preview.searchBar();
            break;

            case 'search-result':
            this.preview.handleSearchResult(arg.content);
            break;

            case 'new-file':
            // User wants to open a new file. Display modal
            if((arg.content != null) && arg.content.hasOwnProperty('hash')) {
                // User has probably right clicked
                this.body.requestFileName(this.findObject(arg.content.hash));
            } else {
                this.body.requestFileName(this.getCurrentDir());
            }
            break;

            case 'new-dir':
            // User wants to create a new directory. Display modal
            if(arg.content.hasOwnProperty('hash')) {
                // User has probably right clicked
                this.body.requestDirName(this.findObject(arg.content.hash));
            } else {
                this.body.requestDirName(this.getCurrentDir());
            }
            break;

            case 'open-dir':
            // User has requested to open another folder. Notify host process.
            this.ipc.send('open-dir', {});
            break;

            case 'rename-file':
            if(arg.content.hasOwnProperty('hash')) {
                // Another file should be renamed
                // Rename a file based on a hash -> find it
                this.body.requestNewFileName(this.findObject(arg.content.hash));
            }else if(this.getCurrentFile() != null) {
                this.body.requestNewFileName(this.getCurrentFile());
            }
            break;

            case 'rename-dir':
            if(arg.content.hasOwnProperty('hash')) {
                // Another dir should be renamed
                // Rename a dir based on a hash -> find it
                this.body.requestNewDirName(this.findObject(arg.content.hash));
            } else if(this.getCurrentDir() != null) {
                this.body.requestNewDirName(this.getCurrentDir());
            }
            break;

            case 'remove-file':
            // The user has requested to delete the current file
            // Request from main process
            if(arg.content.hasOwnProperty('hash')) {
                this.ipc.send('delete-file', { 'hash': arg.content.hash });
            } else {
                this.ipc.send('delete-file', {});
            }
            break;

            case 'remove-dir':
            // The user has requested to delete the current file
            // Request from main process
            if(arg.content.hasOwnProperty('hash')) {
                this.ipc.send('delete-dir', { 'hash': arg.content.hash });
            } else {
                this.ipc.send('delete-dir', {});
            }
            break;

            case 'toggle-theme':
            // User wants to switch the theme
            this.directories.toggleTheme();
            this.preview.toggleTheme();
            this.editor.toggleTheme();
            if(arg.content !== 'no-emit') {
                this.ipc.send('toggle-theme'); // Notify host process for configuration save
            }
            break;

            case 'toggle-snippets':
            this.preview.toggleSnippets();
            if(arg.content !== 'no-emit') {
                this.ipc.send('toggle-snippets');
            }
            break;

            case 'export':
            if(this.getCurrentFile() != null) {
                this.body.displayExport(this.getCurrentFile());
            }
            break;

            case 'open-preferences':
            this.ipc.send('get-preferences', {});
            break;

            case 'preferences':
            this.body.displayPreferences(arg.content);
            break;

            // Execute a command with CodeMirror (Bold, Italic, Link, etc)
            case 'cm-command':
            this.editor.runCommand(arg.content);
            break;

            case 'binaries':
            // Received event containing vars for the found binaries on
            // this system (especially exporting, e.g. pandoc and pdflatex)
            this.pandoc = arg.content.pandoc;
            this.pdflatex = arg.content.pdflatex;
            break;

            default:
            console.log('Unknown command received: ' + arg.command);
            break;
        }
    };

    // Helper function to find dummy file/dir objects based on a hash
    this.findObject = function(hash, obj = this.paths) {
        if(obj.hash == hash) {
            return obj;
        } else if(obj.hasOwnProperty('children')) {
            for(let c of obj.children) {
                ret = this.findObject(hash, c);
                if(ret != null) {
                    return ret;
                }
            }
        }

        return null;
    };

    // Triggered by ZettlrDirectories - if user clicks on another dir
    this.requestDir = function(hash) {
        // Ask main process for a new file list
        this.ipc.send('get-file-list', hash);
    };

    this.requestMove = function(from, to) {
        // Ask main process for moving
        this.ipc.send('request-move', { 'from': from, 'to': to });
    };

    // Triggered by ZettlrPreview - if user clicks on another file
    this.requestFile = function(hash) {
        // Ask main process for a file.
        this.ipc.send('get-file', hash);
    };

    // Triggered by ZettlrEditor - if the content of editor changes.
    this.setModified = function() {
        this.ipc.send('file-modified', {});
    };

    // Triggered by ZettlrBody - user has entered a new file name and confirmed
    this.requestNewFile = function(name, hash) {
        this.ipc.send('new-file', { 'name': name, 'hash': hash });
    };

    // Also triggered by ZettlrBody, only for directory
    this.requestNewDir = function(name, hash) {
        this.ipc.send('new-dir', { 'name': name, 'hash': hash });
    };

    // Also triggered by ZettlrBody on export
    this.requestExport = function(hash, ext) {
        this.ipc.send('export', { 'hash': hash, 'ext': ext});
    };

    // Triggered by ZettlrBody on DirRename
    this.requestDirRename = function(val, hash) {
        this.ipc.send('rename-dir', { 'hash': hash, 'name': val });
    };

    // Triggered by ZettlrBody on FileRename
    this.requestFileRename = function(val, hash) {
        this.ipc.send('rename-file', { 'hash': hash, 'name': val });
    };

    this.saveSettings = function(cfg) {
        this.ipc.send('update-config', cfg);
    };

    this.setCurrentFile = function(newfile) {
        this.currentFile = newfile;
    };

    this.setCurrentDir = function(newdir) {
        this.currentDir = newdir;
    };

    this.getCurrentFile = function() {
        return this.currentFile;
    };

    this.getCurrentDir = function() {
        return this.currentDir;
    };
} // END CLASS

// module.exports = ZettlrRenderer;
