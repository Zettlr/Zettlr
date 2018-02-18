/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrRenderer class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Controls the whole renderer process.
 *
 * END HEADER
 */

const ZettlrRendererIPC = require('../zettlr-rendereripc.js');
const ZettlrDirectories = require('../zettlr-directories.js');
const ZettlrPreview     = require('../zettlr-preview.js');
const ZettlrEditor      = require('../zettlr-editor.js');
const ZettlrBody        = require('../zettlr-body.js');
const ZettlrOverlay     = require('../zettlr-overlay.js');
const ZettlrToolbar     = require('../zettlr-toolbar.js');
const ZettlrPomodoro    = require('../zettlr-pomodoro.js');

const Typo              = require('typo-js');
const remote            = require('electron').remote;

const {trans}           = require('../../common/lang/i18n.js');

/**
 * ZettlrRenderer class
 */
class ZettlrRenderer
{
    /**
     * Initialize all dynamic elements in the renderer process
     */
    constructor()
    {
        this.currentFile    = null;
        this.currentDir     = null;
        this.paths          = null;
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

        // Init the complete list of objects that we need
        this.ipc            = new ZettlrRendererIPC(this);
        this.directories    = new ZettlrDirectories(this);
        this.preview        = new ZettlrPreview(this);
        this.editor         = new ZettlrEditor(this);
        this.body           = new ZettlrBody(this);
        this.overlay        = new ZettlrOverlay(this);
        this.toolbar        = new ZettlrToolbar(this);
        this.pomodoro       = new ZettlrPomodoro(this);
    }

    /**
     * Begin sending the first wave of messages to get info from main.
     * @return {void} Nothing to return.
     */
    init()
    {
        this.overlay.show(trans('init.welcome'));

        // First request the configuration
        // Now eventually switch the theme to dark
        this.ipc.send('config-get', 'darkTheme');
        this.ipc.send('config-get', 'snippets');
        this.ipc.send('config-get', 'app_lang');
        this.ipc.send('config-get-env', 'pandoc');
        this.ipc.send('config-get-env', 'pdflatex');

        // Request a first batch of files
        this.ipc.send('get-paths', {});

        // Also, request the typo things
        this.ipc.send('typo-request-lang', {});
    }

    /**
     * Switch over the received message.
     * @param  {Event} event Unused
     * @param  {Object} arg   The message's body
     * @return {void}       Nothing to return.
     * @deprecated Will be moved to Renderer-IPC in another version
     */
    handleEvent(event, arg)
    {
        switch(arg.command)
        {
            case 'paths':
            // arg contains a JSON with all paths and files
            // Initial command.
            this.body.closeQuicklook();
            this.setCurrentDir(arg.content);
            this.setCurrentFile(null);
            this.paths = arg.content;
            this.directories.empty();
            this.directories.refresh();
            this.preview.refresh();
            this.directories.select(arg.content.hash);
            break;

            case 'paths-update':
            // Update the paths
            this.updatePaths(arg.content);
            this.directories.refresh();
            this.preview.refresh();
            break;

            // DIRECTORIES
            case 'dir-set-current':
            // Received a new directory
            this.setCurrentDir(arg.content);
            this.directories.select(arg.content.hash);
            this.preview.refresh();
            break;

            case 'dir-find':
            // User wants to search in current directory.
            this.toolbar.focusSearch();
            break;

            case 'dir-open':
            // User has requested to open another folder. Notify host process.
            this.ipc.send('dir-open', {});
            break;

            case 'dir-rename':
            if(arg.content.hasOwnProperty('hash')) {
                // Another dir should be renamed
                // Rename a dir based on a hash -> find it
                this.body.requestNewDirName(this.findObject(arg.content.hash));
            } else if(this.getCurrentDir() != null) {
                // Root means the parent has no type property.
                if(this.getCurrentDir().parent.hasOwnProperty('type')) {
                    this.body.requestNewDirName(this.getCurrentDir());
                }
            }
            break;

            case 'dir-new':
            // User wants to create a new directory. Display modal
            if(arg.content.hasOwnProperty('hash')) {
                // User has probably right clicked
                this.body.requestDirName(this.findObject(arg.content.hash));
            } else {
                this.body.requestDirName(this.getCurrentDir());
            }
            break;

            case 'dir-delete':
            // The user has requested to delete the current file
            // Request from main process
            if(arg.content.hasOwnProperty('hash')) {
                this.ipc.send('dir-delete', { 'hash': arg.content.hash });
            } else {
                this.ipc.send('dir-delete', {});
            }
            break;

            // FILES

            case 'file-set-current':
            this.setCurrentFile(arg.content);
            this.preview.select(arg.content.hash);
            break;

            case 'file-open':
            // We have received a new file. So close the old and open the new
            this.editor.close();
            this.setCurrentFile(arg.content);
            this.preview.select(arg.content.hash);
            this.editor.open(arg.content);
            break;

            case 'file-close':
            // We have received a close-file command.
            this.editor.close();
            this.setCurrentFile(null);
            break;

            case 'file-save':
            // The user wants to save the currently opened file.
            let file = this.getCurrentFile();
            if(file == null) {
                // User wants to save an untitled file
                // Important: The main Zettlr-class expects hash to be null
                // for new files
                file = {};
            }
            file.content = this.editor.getValue();
            file.wordcount = this.editor.getWrittenWords(); // For statistical purposes only =D
            this.ipc.send('file-save', file);
            break;

            case 'file-rename':
            if(arg.content.hasOwnProperty('hash')) {
                // Another file should be renamed
                // Rename a file based on a hash -> find it
                this.body.requestNewFileName(this.findObject(arg.content.hash));
            }else if(this.getCurrentFile() != null) {
                this.body.requestNewFileName(this.getCurrentFile());
            }
            break;

            case 'file-new':
            // User wants to open a new file. Display modal
            if((arg.content != null) && arg.content.hasOwnProperty('hash')) {
                // User has probably right clicked
                this.body.requestFileName(this.findObject(arg.content.hash));
            } else {
                this.body.requestFileName(this.getCurrentDir());
            }
            break;

            case 'file-find':
            this.editor.openFind();
            break;

            case 'file-insert':
            this.preview.refresh();
            // this.preview.insert(arg.content);
            break;

            case 'file-delete':
            // The user has requested to delete the current file
            // Request from main process
            if(arg.content.hasOwnProperty('hash')) {
                this.ipc.send('file-delete', { 'hash': arg.content.hash });
            } else {
                this.ipc.send('file-delete', {});
            }
            break;

            case 'file-search-result':
            this.preview.handleSearchResult(arg.content);
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

            case 'config':
            switch(arg.content.key)
            {
                case 'darkTheme':
                // Will only be received once, so simply "toggle" from initial
                // light theme to dark
                if(arg.content.value == true) {
                    this.directories.toggleTheme();
                    this.preview.toggleTheme();
                    this.editor.toggleTheme();
                    this.body.toggleTheme();
                    this.toolbar.toggleTheme();
                }
                break;
                case 'snippets':
                // Will only be received once; if false toggle from initial "true"
                // state.
                if(!arg.content.value) {
                    this.preview.toggleSnippets();
                }
                break;
                case 'app_lang':
                this.lang = arg.content.value;
                break;
                case 'pandoc':
                this.pandoc = arg.content.value;
                break;
                case 'pdflatex':
                this.pdflatex = arg.content.value;
                break;
            }
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

            case 'notify':
            this.body.notify(arg.content);
            break;

            // Pomodoro timer toggle
            case 'pomodoro':
            this.pomodoro.popup();
            break;

            // Zoom
            case 'zoom-reset':
            this.editor.zoom(0); // <-- Sometimes I think I am stupid. Well, but it works, I guess.
            break;
            case 'zoom-in':
            this.editor.zoom(1);
            break;
            case 'zoom-out':
            this.editor.zoom(-1);
            break;

            default:
            console.log(trans('system.unknown_command', arg.command));
            break;
        }
    }

    /**
     * Helper function to find dummy file/dir objects based on a hash
     * @param  {Integer} hash             The hash identifying whatever is to be searched for.
     * @param  {Object} [obj=this.paths] A sub-object or the whole tree to be searched.
     * @return {Mixed}                  Either null, or ZettlrFile/ZettlrDir if found.
     */
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

    /**
     * A new paths object came from main process. This function replaces the
     * renderer's and re-sets current's pointers.
     * @param  {Object} nData The new file tree
     * @return {void}       Nothing to return.
     */
    updatePaths(nData)
    {
        this.paths = nData;
        if(this.getCurrentDir()) {
            this.setCurrentDir(this.findObject(this.getCurrentDir().hash));
        } else {
            this.setCurrentDir(this.paths); // Reset
        }
        if(this.getCurrentFile()) {
            this.setCurrentFile(this.findObject(this.getCurrentFile().hash));
        }
    }

    // SPELLCHECKER FUNCTIONS

    /**
     * Is called when we receive the array of enabled spellchecking langs. This
     * begins fetching all of them by requesting the first aff-file.
     * @param {Array} langs The array from main with correct info about the spellchecker.
     */
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

    /**
     * Requests a language file (either aff or dic)
     * @param  {String} type The type of file, either "aff" or "dic"
     * @return {void}      Nothing to return.
     */
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

    /**
     * This function checks for existence of Aff and Dic files and then inits
     * the given language using the dictionaries.
     * @return {void} Nothing to return.
     */
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

    /**
     * This function returns either true or false based on whether or not the
     * word given has been found in any of the dictionaries.
     * @param  {String} word The word to check
     * @return {Boolean}      True, if it has been found, or false if no language recognizes it.
     */
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

    /**
     * Returns an array of suggested correct spellings of a word.
     * @param  {String} word The word to get suggestions for.
     * @return {Array}      An array of strings containing suggestions.
     */
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

    /**
     * Pass-through function from ZettlrToolbar to ZettlrPreview. TODO: This
     * looks weird from a organizational perspective.
     * @param  {String} term The term to be searched for.
     * @return {void}      Nothing to return.
     */
    beginSearch(term) { this.preview.beginSearch(term); }

    /**
     * Pass-through function from ZettlrPreview to Toolbar.
     * @param  {Integer} curIndex Current searched file
     * @param  {Integer} count    Absolute count of files to search.
     * @return {void}          Nothing to return.
     */
    searchProgress(curIndex, count) { this.toolbar.searchProgress(curIndex, count); }

    /**
     * Pass-through function from ZettlrPreview to Toolbar.
     * @return {void} Nothing to return.
     */
    endSearch() { this.toolbar.endSearch(); }

    /**
     * Pass-through function from ZettlrEditor to ZettlrToolbar.
     * @param  {Integer} words Number of words in editor.
     * @return {void}       Nothing to return.
     */
    updateWordCount(words) { this.toolbar.updateWordCount(words); }

    /**
     * Request the selection of the directory in main. TODO: Rename function
     * (because we are not REALLY requesting the dir, only that the pointer is
     * set!)
     * @param  {Integer} hash As usually, a hash identifying a directory.
     * @return {void}      Nothing to return.
     */
    requestDir(hash) { this.ipc.send('dir-select', hash); }

    /**
     * Triggered when a file or dir is dropped on a dir.
     * @param  {Integer} from Hash of the source file/dir.
     * @param  {Integer} to   Where to move? (Hash)
     * @return {void}      Nothing to return.
     */
    requestMove(from, to) { this.ipc.send('request-move', { 'from': from, 'to': to }); }

    /**
     * Requests the opening of another file in editor.
     * @param  {Integer} hash The hash of the file to be loaded.
     * @return {void}      Nothing to return.
     */
    requestFile(hash) { this.ipc.send('file-get', hash); }

    /**
     * Executed when a user has finished typing a new file name.
     * @param  {String} name The new name
     * @param  {Integer} hash The containing dir's hash
     * @return {void}      Nothing to return.
     */
    requestNewFile(name, hash) { this.ipc.send('file-new', { 'name': name, 'hash': hash }); }

    /**
     * Executed when a user has finished typing a new dir name.
     * @param  {String} name The new name
     * @param  {Integer} hash The containing dir's hash
     * @return {void}      Nothing to return.
     */
    requestNewDir(name, hash) { this.ipc.send('dir-new', { 'name': name, 'hash': hash }); }

    /**
     * Executed when the user clicks on a filetype to export to.
     * @param  {Integer} hash The hash of the file to be exported
     * @param  {String} ext  Either "odt", "docx", "html" or "pdf".
     * @return {void}      Nothing to return.
     */
    requestExport(hash, ext) { this.ipc.send('export', { 'hash': hash, 'ext': ext}); }

    /**
     * Requests a rename of a directory.
     * @param  {String} val  The new name.
     * @param  {Integer} hash The directory's identifier.
     * @return {void}      Nothing to return.
     */
    requestDirRename(val, hash) { this.ipc.send('dir-rename', { 'hash': hash, 'name': val }); }

    /**
     * Request a rename of a file.
     * @param  {String} val  The new name
     * @param  {Integer} hash The identifier of the file.
     * @return {void}      Nothing to return.
     */
    requestFileRename(val, hash) { this.ipc.send('file-rename', { 'hash': hash, 'name': val }); }

    /**
     * Called by the dialog when the user saves the settings.
     * @param  {Object} cfg A correct configuration object to be sent to main.
     * @return {void}     Nothing to return.
     */
    saveSettings(cfg) { this.ipc.send('update-config', cfg); }

    /**
     * Simply sets the current file pointer to the new.
     * @param {ZettlrFile} newfile The new file's pointer.
     */
    setCurrentFile(newfile) { this.currentFile = newfile; }

    /**
     * Sets the current dir pointer to the new. TODO: Maybe include a selection thingy here.
     * @param {ZettlrDir} newdir The new dir.
     */
    setCurrentDir(newdir) { this.currentDir = newdir; }

    /**
     * Returns the current file's pointer.
     * @return {ZettlrFile} The file object.
     */
    getCurrentFile() { return this.currentFile; }

    /**
     * Returns the current directory's pointer.
     * @return {ZettlrDir} The dir object.
     */
    getCurrentDir() { return this.currentDir; }

    /**
     * Returns the language of the GUI.
     * @return {String} The language code.
     */
    getLocale() { return this.lang; }

    /**
     * Simply indicates to main to set the modified flag.
     */
    setModified() { this.ipc.send('file-modified', {}); }
} // END CLASS
