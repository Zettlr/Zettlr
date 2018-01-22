/* Main Renderer */

// Enable communication with host process
const ZettlrRendererIPC = require('../zettlr-rendereripc.js');
const ZettlrDirectories = require('../zettlr-directories.js');
const ZettlrPreview     = require('../zettlr-preview.js');
const ZettlrEditor      = require('../zettlr-editor.js');
const ZettlrBody        = require('../zettlr-body.js');
const ZettlrOverlay     = require('../zettlr-overlay.js');
const ZettlrToolbar     = require('../zettlr-toolbar.js');
const Typo              = require('typo-js');
const remote            = require('electron').remote;

const {trans}           = require('../../common/lang/i18n.js');

/* CLASS */
class ZettlrRenderer
{
    constructor()
    {
        this.currentFile    = null;
        this.currentDir     = null;

        this.lang           = 'en_US'; // Default fallback

        // Spellchecking vars
        this.typoReady      = false;   // Flag indicating whether Typo has already loaded
        this.typoLang       = {};      // Which language(s) are we spellchecking?
        this.typoAff        = null;    // Contains the Aff-file data
        this.typoDic        = null;    // Contains the dic-file data
        this.typo           = [];      // Contains the Typo object to check with

        // Indicators whether or not one of these has been found
        this.pandoc         = false;
        this.pdflatex       = false;

        // Write translation data into renderer process's global var
        global.i18n         = remote.getGlobal('i18n');

        this.ipc            = new ZettlrRendererIPC(this);
        this.directories    = new ZettlrDirectories(this);
        this.preview        = new ZettlrPreview(this);
        this.editor         = new ZettlrEditor(this);
        this.body           = new ZettlrBody(this);
        this.overlay        = new ZettlrOverlay(this);
        this.toolbar        = new ZettlrToolbar(this);
    }

    init()
    {
        this.overlay.show(trans('init.welcome'));

        // Request a first batch of files
        this.ipc.send('get-paths', {});

        // Also, request the typo things
        this.ipc.send('typo-request-lang', {});
    }

    handleEvent(event, arg)
    {
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
            this.body.closeQuicklook();
            break;

            case 'dir-list':
            // A directory was created or removed, so repaint.
            this.directories.newDirectoryList(arg.content);
            this.paths = arg.content;
            break;

            case 'file-list':
            // We have received a new file list in arg
            // Set the current dir
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
            let file = this.getCurrentFile();
            if(file == null) {
                // User wants to save an untitled file
                // Important: The main Zettlr-class expects hash to be null
                // for new files
                file = {};
            }
            file.content = this.editor.getValue();
            this.ipc.send('save-file', file);
            break;

            case 'find-file':
            this.editor.openFind();
            break;

            case 'find-dir':
            // User wants to search in current directory.
            // this.preview.searchBar();
            this.toolbar.focusSearch();
            break;

            case 'file-remove':
            // A file should be removed
            this.preview.remove(arg.content);
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
            this.body.toggleTheme();
            this.toolbar.toggleTheme();
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

            case 'toggle-directories':
            this.directories.toggleDisplay();
            this.preview.toggleDirectories();
            this.editor.toggleDirectories();
            break;

            case 'toggle-preview':
            this.editor.togglePreview();
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
            // After a codemirror command has been issued through this function
            // give the editor back focus
            this.editor.cm.focus();
            break;

            case 'binaries':
            // Received event containing vars for the found binaries on
            // this system (especially exporting, e.g. pandoc and pdflatex)
            this.pandoc = arg.content.pandoc;
            this.pdflatex = arg.content.pdflatex;
            break;

            case 'lang':
            // Received the language
            this.lang = arg.content;
            break;

            // SPELLCHECKING EVENTS
            case 'typo-lang':
            // arg.content contains an object holding trues and falses for all
            // languages to be checked simultaneously
            this.setSpellcheck(arg.content);
            // Also pass down the languages to the body so that it can display
            // them in the preferences dialog
            this.body.setSpellcheckLangs(arg.content);
            break;

            // Receive the typo aff!
            case 'typo-aff':
            this.typoAff = arg.content;
            this.requestLang('dic');
            break;

            // Receive the typo dic!
            case 'typo-dic':
            this.typoDic = arg.content;
            // Now we can finally initialize spell check:
            this.initTypo();
            break;

            case 'quicklook':
            this.ipc.send('file-get-quicklook', arg.content.hash);
            break;

            case 'file-quicklook':
            this.body.quicklook(arg.content);
            break;

            default:
            console.log(trans('system.unknown_command', arg.command));
            break;
        }
    }

    // Helper function to find dummy file/dir objects based on a hash
    findObject(hash, obj = this.paths)
    {
        if(obj.hash == hash) {
            return obj;
        } else if(obj.hasOwnProperty('children')) {
            for(let c of obj.children) {
                let ret = this.findObject(hash, c);
                if(ret != null) {
                    return ret;
                }
            }
        }
        return null;
    }

    // SPELLCHECKER FUNCTIONS
    setSpellcheck(langs)
    {
        this.overlay.update(trans('init.spellcheck.get_lang'));
        // langs is an object containing _all_ available languages and whether
        // they should be checked or not.
        for(let prop in langs) {
            if(langs[prop]) {
                // We should spellcheck - so insert into the object with a
                // false, indicating that it has not been loaded yet.
                this.typoLang[prop] = false;
            }
        }

        if(Object.keys(this.typoLang).length > 0) {
            this.requestLang('aff');
        } else {
            // We're already done!
            this.overlay.close();
        }
    }

    requestLang(type)
    {
        let req = null;
        for(let lang in this.typoLang) {
            if(!this.typoLang[lang]) {
                // We should load this lang
                req = lang;
                break;
            }
        }
        this.overlay.update(
            trans(
                'init.spellcheck.request_file',
                trans('dialog.preferences.app_lang.'+req)
            )
        );

        // Load the first lang (first aff, then dic)
        this.ipc.send('typo-request-' + type, req);
    }

    initTypo()
    {
        if(!this.typoLang) { return; }
        if(!this.typoAff)  { return; }
        if(!this.typoDic)  { return; }

        let lang = null;
        for(let l in this.typoLang) {
            if(!this.typoLang[l]) {
                // This language should be initialized
                lang = l;
                break;
            }
        }

        this.overlay.update(
            trans(
                'init.spellcheck.init',
                trans('dialog.preferences.app_lang.'+lang)
            )
        );

        // Initialize typo and we're set!
        this.typo.push(new Typo(lang, this.typoAff, this.typoDic));
        this.typoLang[lang] = true; // This language is now initialized

        this.overlay.update(
            trans(
                'init.spellcheck.init_done',
                trans('dialog.preferences.app_lang.'+lang)
            )
        );

        // Free memory
        this.typoAff = null;
        this.typoDic = null;

        let done = true;
        for(let l in this.typoLang) {
            if(!this.typoLang[l]) {
                done = false;
                break;
            }
        }

        if(!done) {
            // There is still at least one language to load. -> request next aff
            this.requestLang('aff');
        } else {
            // Done - enable language checking
            this.typoReady = true;
            this.overlay.close(); // Done!
        }
    }

    // This function takes a word and returns true or falls depending on
    // whether or not the word has been spelled correctly using the given
    // spellchecking language
    typoCheck(word)
    {
        if(!this.typoReady) {
            return true; // true means: No wrong spelling detected
        }

        for(let lang of this.typo) {
            if(lang.check(word)) {
                // As soon as the word is correct in any lang, break and return true
                return true;
            }
        }

        // No language reported the word exists
        return false;
    }

    typoSuggest(word)
    {
        if(!this.typoReady) {
            return [];
        }

        let ret = [];

        for(let lang of this.typo) {
            ret = ret.concat(lang.suggest(word));
        }

        return ret;
    }

    // END SPELLCHECKER

    // SEARCH FUNCTIONS
    // This class only acts as a pass-through
    beginSearch(term)
    {
        this.preview.beginSearch(term);
    }

    searchProgress(curIndex, count)
    {
        this.toolbar.searchProgress(curIndex, count);
    }

    endSearch()
    {
        this.toolbar.endSearch();
    }

    updateWordCount(words)
    {
        this.toolbar.updateWordCount(words);
    }


    // Triggered by ZettlrDirectories - if user clicks on another dir
    requestDir(hash)
    {
        // Ask main process for a new file list
        this.ipc.send('get-file-list', hash);
    }

    requestMove(from, to)
    {
        // Ask main process for moving
        this.ipc.send('request-move', { 'from': from, 'to': to });
    }

    // Triggered by ZettlrPreview - if user clicks on another file
    requestFile(hash)
    {
        // Ask main process for a file.
        this.ipc.send('get-file', hash);
    }

    // Triggered by ZettlrEditor - if the content of editor changes.
    setModified()
    {
        this.ipc.send('file-modified', {});
    }

    // Triggered by ZettlrBody - user has entered a new file name and confirmed
    requestNewFile(name, hash)
    {
        this.ipc.send('new-file', { 'name': name, 'hash': hash });
    }

    // Also triggered by ZettlrBody, only for directory
    requestNewDir(name, hash)
    {
        this.ipc.send('new-dir', { 'name': name, 'hash': hash });
    }

    // Also triggered by ZettlrBody on export
    requestExport(hash, ext)
    {
        this.ipc.send('export', { 'hash': hash, 'ext': ext});
    }

    // Triggered by ZettlrBody on DirRename
    requestDirRename(val, hash)
    {
        this.ipc.send('rename-dir', { 'hash': hash, 'name': val });
    }

    // Triggered by ZettlrBody on FileRename
    requestFileRename(val, hash)
    {
        this.ipc.send('rename-file', { 'hash': hash, 'name': val });
    }

    saveSettings(cfg)
    {
        this.ipc.send('update-config', cfg);
    }

    setCurrentFile(newfile)
    {
        this.currentFile = newfile;
    }

    setCurrentDir(newdir)
    {
        this.currentDir = newdir;
    }

    getCurrentFile()
    {
        return this.currentFile;
    };

    getCurrentDir()
    {
        return this.currentDir;
    }

    getLocale()
    {
        return this.lang;
    }
} // END CLASS
