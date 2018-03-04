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
const ZettlrPopup       = require('../zettlr-popup.js');

const Typo              = require('typo-js');
const remote            = require('electron').remote;

const {trans}           = require('../../common/lang/i18n.js');

/**
 * This is the pendant class to the Zettlr class in the main process. It mirrors
 * the functionality of the main process, only that the functionality in here
 * is connected with the rendering, not with the reading of files, etc. This is
 * the only object that is directly referenced from with the index.html file --
 * this is why all the paths in here do not begin in the `renderer` directory,
 * but in the assets directory (which is where the index.htm resides).
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

    finishStartup()
    {
        // Here we can init actions and stuff to be done after the startup has finished
        setTimeout(() => { this.poll(); }, 10000); // Poll every ten seconds
    }

    poll()
    {
        // Do recurring tasks.
        this.autoSave();

        // Set next timeout
        setTimeout(() => { this.poll(); }, 10000);
    }

    /**
     * The toolbar buttons trigger IPC event types. Therefore simply forward to
     * the IPC which in turn will call the corresponding events on this class.
     * @param  {String} cmd The command
     * @param  {Object} cnt The message's body
     * @return {void}     No return.
     */
    handleEvent(cmd, cnt)
    {
        this.ipc.handleEvent(cmd, cnt);
    }

    /**
     * The user has opened a completely new directory.
     * @param  {Object} newPaths The new paths object
     * @return {void}          As this is called by event handler, don't do a thing.
     */
    newProject(newPaths)
    {
        this.paths = newPaths;
        this.body.closeQuicklook();
        this.setCurrentDir(newPaths);
        this.setCurrentFile(null);
        this.directories.empty();
        this.directories.refresh();
        this.preview.refresh();
        this.directories.select(newPaths.hash);
    }

    /**
     * Update somewhere in the paths.
     * @param  {[type]} newPaths [description]
     * @return {[type]}          [description]
     */
    refresh(newPaths)
    {
        this.updatePaths(newPaths);
        this.directories.refresh();
        this.preview.refresh();
    }

    /**
     * Requests the renaming of either the current or another directory.
     * @param  {Object} arg Message body
     * @return {void}     No return.
     */
    renameDir(arg)
    {
        if(arg.hasOwnProperty('hash')) {
            // Another dir should be renamed
            // Rename a dir based on a hash -> find it
            this.body.requestNewDirName(this.findObject(arg.hash));
        } else if(this.getCurrentDir() != null) {
            // Root means the parent has no type property. (IMPORTANT: NEVER
            // ever think it would be a good idea to give ZettlrRenderer a type
            // property!! TODO: Harden this.)
            if(this.getCurrentDir().parent.hasOwnProperty('type')) {
                this.body.requestNewDirName(this.getCurrentDir());
            }
        }
    }

    /**
     * Displays the popup for a new directory name.
     * @param  {Object} arg Contains the containing dir's hash
     * @return {void}     No return.
     */
    newDir(arg)
    {
        // User wants to create a new directory. Display modal
        if(arg.hasOwnProperty('hash')) {
            // User has probably right clicked
            this.body.requestDirName(this.findObject(arg.hash));
        } else {
            this.body.requestDirName(this.getCurrentDir());
        }
    }

    /**
     * The user wants to delete a directory
     * @param  {Object} arg Contains the hash (or none)
     * @return {void}     No return.
     */
    deleteDir(arg)
    {
        // The user has requested to delete the current file
        // Request from main process
        if(arg.hasOwnProperty('hash')) {
            this.ipc.send('dir-delete', { 'hash': arg.hash });
        } else {
            this.ipc.send('dir-delete', {});
        }
    }

    /**
     * Toggle the theme
     * @return {void}        No return.
     */
    toggleTheme()
    {
        // Welcome to FUNCTION HELL! (Proposal: How about simply setting the
        // "dark" class on the body ...?)
        this.directories.toggleTheme();
        this.preview.toggleTheme();
        this.editor.toggleTheme();
        this.body.toggleTheme();
        this.toolbar.toggleTheme();
    }

    /**
     * Toggle the display of the directory pane.
     * @return {void} No return.
     */
    toggleDirectories()
    {
        this.directories.toggleDisplay();
        this.preview.toggleDirectories();
        this.editor.toggleDirectories();
    }

    /**
     * Displays a table of content.
     * @return {void} (Point of) No return.
     */
    toc()
    {
        if(this.getCurrentFile() === null) {
            return;
        }

        let toc = this.editor.buildTOC();

        if(toc.length === 0) {
            return;
        }

        let cnt = $('<div>');
        let h1 = 0;
        let h2 = 0;
        let h3 = 0;
        let h4 = 0;
        let h5 = 0;
        let h6 = 0;
        for(let entry of toc) {
            let level = '';
            switch(entry.level) {
                case 1:
                h1++;
                h2 = h3 = h4 = h5 = h6 = 0;
                level = h1;
                break;
                case 2:
                h2++;
                h3 = h4 = h5 = h6 = 0;
                level = [h1, h2].join('.');
                break;
                case 3:
                h3++;
                h4 = h5 = h6 = 0;
                level = [h1, h2, h3].join('.');
                break;
                case 4:
                h4++;
                h5 = h6 = 0;
                level = [h1, h2, h3, h4].join('.');
                break;
                case 5:
                h5++;
                h6 = 0;
                level = [h1, h2, h3, h4, h5].join('.');
                break;
                case 6:
                h6++;
                level = [h1, h2, h3, h4, h5, h6].join('.');
            }

            cnt.append(
                $('<a>').text(level + ' ' + entry.text)
                .attr('data-line', entry.line)
                .attr('href', '#')
                .addClass('toc-link')
            );
        }
        let popup = new ZettlrPopup(this, $('.button.show-toc'), cnt);

        // On click jump to line
        $('.toc-link').click((event) => {
            let elem = $(event.target);
            this.editor.jtl(elem.attr('data-line'));
        });
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
            // Finish and cleanup from startup
            this.finishStartup();
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
            // Finish and cleanup from startup
            this.finishStartup();
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
    setCurrentFile(newfile)
    {
        this.currentFile = newfile;
        // Also directly select it
        if(newfile !== null) {
            this.preview.select(newfile.hash);
        }
    }

    /**
     * Opens a new file
     * @param  {ZettlrFile} f The file to be opened
     */
    openFile(f)
    {
        // We have received a new file. So close the old and open the new
        this.editor.close();
        this.setCurrentFile(f);
        this.preview.select(f.hash);
        this.editor.open(f);
    }

    /**
     * Closes the current file
     */
    closeFile()
    {
        // We have received a close-file command.
        this.editor.close();
        this.setCurrentFile(null);
    }

    /**
     * Saves the current file
     */
    saveFile()
    {
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
    }

    /**
     * Send a file-autosave command to the main process, requesting the creation of an autosave file.
     */
    autoSave()
    {
        // Only create autosaves if the editor is currently dirty
        if(this.editor.isClean()) {
            return;
        }

        let file = this.getCurrentFile();
        if(file == null) {
            file = {};
            file.hash = "undefined";
        }

        file.content = this.editor.getValue();
        this.ipc.send('file-autosave', file);
    }

    /**
     * Request the renaming of a file
     * @param  {ZettlrFile} f The file, whose name should be changed
     */
    renameFile(f)
    {
        if(f.hasOwnProperty('hash')) {
            // Another file should be renamed
            // Rename a file based on a hash -> find it
            this.body.requestNewFileName(this.findObject(f.hash));
        }else if(this.getCurrentFile() != null) {
            this.body.requestNewFileName(this.getCurrentFile());
        }
    }

    /**
     * Create a new file.
     * @param  {ZettlrDir} d Contains a directory in which the file should be created
     */
    newFile(d)
    {
        // User wants to create a new file. Display popup
        if((d != null) && d.hasOwnProperty('hash')) {
            // User has probably right clicked
            this.body.requestFileName(this.findObject(d.hash));
        } else {
            this.body.requestFileName(this.getCurrentDir());
        }
    }

    /**
     * Sets the current dir pointer to the new. TODO: Maybe include a selection thingy here.
     * @param {ZettlrDir} newdir The new dir.
     */
    setCurrentDir(newdir)
    {
        this.currentDir = newdir;
        // What we can also do here: Select the dir and refresh the file list.
        // Because that's what _always_ follows this function call.
        this.directories.select(newdir.hash);
        this.preview.refresh();
    }

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
     * Returns the toolbar object
     * @return {ZettlrToolbar} The current toolbar
     */
    getToolbar() { return this.toolbar; }

    getEditor() { return this.editor; }

    getPreview() { return this.preview; }

    getEditor() { return this.editor; }

    getBody() { return this.body; }

    getPomodoro() { return this.pomodoro; }

    /**
     * Simply indicates to main to set the modified flag.
     */
    setModified() { this.ipc.send('file-modified', {}); }
} // END CLASS
