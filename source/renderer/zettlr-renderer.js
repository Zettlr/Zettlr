/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrRenderer class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
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
const ZettlrStatsView   = require('../zettlr-stats-view.js');
const ZettlrAttachments = require('../zettlr-attachments.js');

const Typo              = require('typo-js');
const remote            = require('electron').remote;
const path              = require('path');

const {trans}           = require('../../common/lang/i18n.js');

                        // Pull the poll-time from the data
const POLL_TIME         = require('../../common/data.json').poll_time;

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
        this._currentFile    = null;
        this._currentDir     = null;
        this._paths          = null;
        this._lang           = 'en_US'; // Default fallback

        // Spellchecking vars
        this._typoReady      = false;   // Flag indicating whether Typo has already loaded
        this._typoLang       = {};      // Which language(s) are we spellchecking?
        this._typoAff        = null;    // Contains the Aff-file data
        this._typoDic        = null;    // Contains the dic-file data
        this._typo           = [];      // Contains the Typo object to check with

        // Write translation data into renderer process's global var
        global.i18n         = remote.getGlobal('i18n');

        // Immediately add the operating system class to the body element to
        // enable the font-family.
        $('body').addClass(process.platform);

        // Init the complete list of objects that we need
        this._ipc            = new ZettlrRendererIPC(this);
        this._directories    = new ZettlrDirectories(this);
        this._preview        = new ZettlrPreview(this);
        this._editor         = new ZettlrEditor(this);
        this._body           = new ZettlrBody(this);
        this._overlay        = new ZettlrOverlay(this);
        this._toolbar        = new ZettlrToolbar(this);
        this._pomodoro       = new ZettlrPomodoro(this);
        this._stats          = new ZettlrStatsView(this);
        this._attachments    = new ZettlrAttachments(this);
    }

    /**
     * Begin sending the first wave of messages to get info from main.
     * @return {void} Nothing to return.
     */
    init()
    {
        this._overlay.show(trans('init.welcome'));

        // First request the configuration
        // Now eventually switch the theme to dark
        this._ipc.send('config-get', 'darkTheme');
        this._ipc.send('config-get', 'snippets');
        this._ipc.send('config-get', 'app_lang');

        // Request a first batch of files
        this._ipc.send('get-paths', {});

        // Also, request the typo things
        this._ipc.send('typo-request-lang', {});
    }

    /**
     * This function gets called when the renderer finishes its startup.
     */
    finishStartup()
    {
        // Here we can init actions and stuff to be done after the startup has finished
        setTimeout(() => { this.poll(); }, POLL_TIME); // Poll every POLL_TIME seconds

        // Send an initial check for an update
        this._ipc.send('update-check');
    }

    /**
     * This function is called every POLL_TIME seconds to execute recurring tasks.
     */
    poll()
    {
        // This poll is useful. You may not see it now, but someday it's gonna
        // be tremendous!

        // Set next timeout
        setTimeout(() => { this.poll(); }, POLL_TIME);
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
        this._ipc.handleEvent(cmd, cnt);
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
            this._body.requestNewDirName(this.findObject(arg.hash));
        } else if(this.getCurrentDir() != null) {
            // Root means the parent has no type property. (IMPORTANT: NEVER
            // ever think it would be a good idea to give ZettlrRenderer a type
            // property!! TODO: Harden this.)
            if(this.getCurrentDir().parent.hasOwnProperty('type')) {
                this._body.requestNewDirName(this.getCurrentDir());
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
            this._body.requestDirName(this.findObject(arg.hash));
        } else {
            this._body.requestDirName(this.getCurrentDir());
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
            this._ipc.send('dir-delete', { 'hash': arg.hash });
        } else {
            this._ipc.send('dir-delete', {});
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
        this._directories.toggleTheme();
        this._preview.toggleTheme();
        this._editor.toggleTheme();
        this._body.toggleTheme();
        this._toolbar.toggleTheme();
    }

    /**
     * Toggle the display of the directory pane.
     * @return {void} No return.
     */
    toggleDirectories()
    {
        this._directories.toggleDisplay();
        this._preview.toggleDirectories();
        this._editor.toggleDirectories();
    }

    /**
     * Toggles display of the attachment pane.
     */
    toggleAttachments()
    {
        this._attachments.toggle();
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

        let toc = this._editor.buildTOC();

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
            this._editor.jtl(elem.attr('data-line'));
        });
    }

    /**
     * Tries to find a given hash in all open directories and files
     * @param  {Number} hash The hash to be searched for
     * @return {Object}      Either a file or a directory object
     */
    findObject(hash)
    {
        let o = null;
        for(let p of this._paths) {
            o = this._find(hash, p);
            if(o != null) {
                break;
            }
        }

        return o;
    }

    /**
     * Helper function to find dummy file/dir objects based on a hash
     * @param  {Integer} hash             The hash identifying whatever is to be searched for.
     * @param  {Object} [obj=this._paths] A sub-object or the whole tree to be searched.
     * @return {Mixed}                  Either null, or ZettlrFile/ZettlrDir if found.
     */
    _find(hash, obj = this._paths)
    {
        if(obj.hash == hash) {
            return obj;
        } else if(obj.hasOwnProperty('children')) {
            for(let c of obj.children) {
                let ret = this._find(hash, c);
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
    refresh(nData)
    {
        this._paths = nData;
        if(this.getCurrentDir() != null) {
            this.setCurrentDir(this.findObject(this.getCurrentDir().hash));
        } else {
            this.setCurrentDir(null); // Reset
        }
        if(this.getCurrentFile() != null) {
            this.setCurrentFile(this.findObject(this.getCurrentFile().hash));
        } else {
            this.setCurrentFile(null);
        }

        // Trigger a refresh in directories and preview and attachment pane
        this._directories.refresh();
        this._preview.refresh();
    }

    // SPELLCHECKER FUNCTIONS

    /**
     * Is called when we receive the array of enabled spellchecking langs. This
     * begins fetching all of them by requesting the first aff-file.
     * @param {Array} langs The array from main with correct info about the spellchecker.
     */
    setSpellcheck(langs)
    {
        this._overlay.update(trans('init.spellcheck.get_lang'));
        // langs is an object containing _all_ available languages and whether
        // they should be checked or not.
        for(let prop in langs) {
            if(langs[prop]) {
                // We should spellcheck - so insert into the object with a
                // false, indicating that it has not been loaded yet.
                this._typoLang[prop] = false;
            }
        }

        if(Object.keys(this._typoLang).length > 0) {
            this.requestLang('aff');
        } else {
            // We're already done!
            this._overlay.close();
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
        for(let lang in this._typoLang) {
            if(!this._typoLang[lang]) {
                // We should load this lang
                req = lang;
                break;
            }
        }
        this._overlay.update(
            trans(
                'init.spellcheck.request_file',
                trans('dialog.preferences.app_lang.'+req)
            )
        );

        // Load the first lang (first aff, then dic)
        this._ipc.send('typo-request-' + type, req);
    }

    /**
     * This function checks for existence of Aff and Dic files and then inits
     * the given language using the dictionaries.
     * @return {void} Nothing to return.
     */
    initTypo()
    {
        if(!this._typoLang) { return; }
        if(!this._typoAff)  { return; }
        if(!this._typoDic)  { return; }

        let lang = null;
        for(let l in this._typoLang) {
            if(!this._typoLang[l]) {
                // This language should be initialized
                lang = l;
                break;
            }
        }

        this._overlay.update(
            trans(
                'init.spellcheck.init',
                trans('dialog.preferences.app_lang.'+lang)
            )
        );

        // Initialize typo and we're set!
        this._typo.push(new Typo(lang, this._typoAff, this._typoDic));
        this._typoLang[lang] = true; // This language is now initialized

        this._overlay.update(
            trans(
                'init.spellcheck.init_done',
                trans('dialog.preferences.app_lang.'+lang)
            )
        );

        // Free memory
        this._typoAff = null;
        this._typoDic = null;

        let done = true;
        for(let l in this._typoLang) {
            if(!this._typoLang[l]) {
                done = false;
                break;
            }
        }

        if(!done) {
            // There is still at least one language to load. -> request next aff
            this.requestLang('aff');
        } else {
            // Done - enable language checking
            this._typoReady = true;
            this._overlay.close(); // Done!
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
        if(!this._typoReady) {
            return true; // true means: No wrong spelling detected
        }

        for(let lang of this._typo) {
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
        if(!this._typoReady) {
            return [];
        }

        let ret = [];

        for(let lang of this._typo) {
            ret = ret.concat(lang.suggest(word));
        }

        return ret;
    }

    // END SPELLCHECKER

    // SEARCH FUNCTIONS
    // This class only acts as a pass-through

    /**
     * This function is called by ZettlrToolbar. The term gets passed on to
     * ZettlrPreview, but also a force-open event is sent to main, in case there
     * is a file that completely matches the file name.
     * @param  {String} term The term to be searched for.
     * @return {void}      Nothing to return.
     */
    beginSearch(term)
    {
        this._ipc.send('force-open', term);
        this._preview.beginSearch(term);
    }

    /**
     * Initiates an auto-search that either directly opens a file (forceOpen=true)
     * or simply automatically searches for something and displays the results.
     * @param  {String} term The content of the Wikilink or Tag that has been clicked
     * @param {Boolean} [forceOpen=false] If true, Zettlr will directly open the file
     */
    autoSearch(term, forceOpen = false)
    {
        if(!forceOpen) {
            // Insert the term into the search field and commence search.
            this._toolbar.setSearch(term);
            this.beginSearch(term);
        } else {
            // Don't search, simply tell main to open the file
            this._ipc.send('force-open', term);
            // Also initiate a search to be run accordingly for any files that
            // might reference the file.
            this._toolbar.setSearch(term);
            this.beginSearch(term);
        }
    }

    /**
     * Pass-through function from ZettlrPreview to Toolbar.
     * @param  {Integer} curIndex Current searched file
     * @param  {Integer} count    Absolute count of files to search.
     * @return {void}          Nothing to return.
     */
    searchProgress(curIndex, count) { this._toolbar.searchProgress(curIndex, count); }

    /**
     * Pass-through function from ZettlrPreview to Toolbar.
     * @return {void} Nothing to return.
     */
    endSearch()
    {
        this._toolbar.endSearch();
        this._preview.endSearch();
    }

    // END search functions

    /**
     * Handles a list of files and directories dropped onto the app.
     * @param  {Array} filelist An array containing all paths.
     */
    handleDrop(filelist)
    {
        this._ipc.send('handle-drop', filelist);
    }

    /**
     * Pass-through function from ZettlrEditor to ZettlrToolbar.
     * @param  {Integer} words Number of words in editor.
     * @return {void}       Nothing to return.
     */
    updateWordCount(words) { this._toolbar.updateWordCount(words); }

    /**
     * Request the selection of the directory in main. TODO: Rename function
     * (because we are not REALLY requesting the dir, only that the pointer is
     * set!)
     * @param  {Integer} hash As usually, a hash identifying a directory.
     * @return {void}      Nothing to return.
     */
    requestDir(hash) { this._ipc.send('dir-select', hash); }

    /**
     * Triggered when a file or dir is dropped on a dir.
     * @param  {Integer} from Hash of the source file/dir.
     * @param  {Integer} to   Where to move? (Hash)
     * @return {void}      Nothing to return.
     */
    requestMove(from, to) { this._ipc.send('request-move', { 'from': from, 'to': to }); }

    /**
     * Requests the opening of another file in editor.
     * @param  {Integer} hash The hash of the file to be loaded.
     * @return {void}      Nothing to return.
     */
    requestFile(hash) { this._ipc.send('file-get', hash); }

    /**
     * Tells the main to tell the directory to sort itself
     * @param  {Number} hash The hash of the directory to be sorted
     * @param  {String} type Either time or name
     */
    sortDir(hash, type) { this._ipc.send('dir-sort', {'hash':hash, 'type':type}); }

    /**
     * Executed when a user has finished typing a new file name.
     * @param  {String} name The new name
     * @param  {Integer} hash The containing dir's hash
     * @return {void}      Nothing to return.
     */
    requestNewFile(name, hash) { this._ipc.send('file-new', { 'name': name, 'hash': hash }); }

    /**
     * Executed when a user has finished typing a new dir name.
     * @param  {String} name The new name
     * @param  {Integer} hash The containing dir's hash
     * @return {void}      Nothing to return.
     */
    requestNewDir(name, hash) { this._ipc.send('dir-new', { 'name': name, 'hash': hash }); }

    /**
     * Executed when the user clicks on a filetype to export to.
     * @param  {Integer} hash The hash of the file to be exported
     * @param  {String} ext  Either "odt", "docx", "html" or "pdf".
     * @return {void}      Nothing to return.
     */
    requestExport(hash, ext) { this._ipc.send('export', { 'hash': hash, 'ext': ext}); }

    /**
     * Requests a rename of a directory.
     * @param  {String} val  The new name.
     * @param  {Integer} hash The directory's identifier.
     * @return {void}      Nothing to return.
     */
    requestDirRename(val, hash) { this._ipc.send('dir-rename', { 'hash': hash, 'name': val }); }

    /**
     * Request a rename of a file.
     * @param  {String} val  The new name
     * @param  {Integer} hash The identifier of the file.
     * @return {void}      Nothing to return.
     */
    requestFileRename(val, hash) { this._ipc.send('file-rename', { 'hash': hash, 'name': val }); }

    /**
     * Called by the dialog when the user saves the settings.
     * @param  {Object} cfg A correct configuration object to be sent to main.
     * @return {void}     Nothing to return.
     */
    saveSettings(cfg) { this._ipc.send('update-config', cfg); }

    /**
     * Opens a new file
     * @param  {ZettlrFile} f The file to be opened
     */
    openFile(f)
    {
        // We have received a new file. So close the old and open the new
        this._editor.close();
        this.setCurrentFile(f);
        // Select the file either in the preview list or in the directory tree
        this._preview.select(f.hash);
        this._directories.select(f.hash);
        this._editor.open(f);
    }

    /**
     * Closes the current file
     */
    closeFile()
    {
        // We have received a close-file command.
        this._editor.close();
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
        file.content = this._editor.getValue();
        file.wordcount = this._editor.getWrittenWords(); // For statistical purposes only =D
        this._ipc.send('file-save', file);
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
            this._body.requestNewFileName(this.findObject(f.hash));
        }else if(this.getCurrentFile() != null) {
            this._body.requestNewFileName(this.getCurrentFile());
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
            this._body.requestFileName(this.findObject(d.hash));
        } else {
            this._body.requestFileName(this.getCurrentDir());
        }
    }

    /**
     * Exits the search, i.e. resets everything back to what it looked like.
     */
    exitSearch()
    {
        this._preview.showFiles();
        this._editor.unmarkResults();
    }

    /**
     * Sets the current dir pointer to the new.
     * @param {ZettlrDir} newdir The new dir.
     */
    setCurrentDir(newdir = null)
    {
        let oldDir = this._currentDir;
        this._currentDir = newdir;
        this._attachments.refresh();

        if(newdir != null) {
            // What we can also do here: Select the dir and refresh the file list.
            // Because that's what _always_ follows this function call.
            this._directories.select(newdir.hash);
            if((oldDir != null) && (newdir != null) && (oldDir.path != newdir.path)) {
                // End (potential) displaying of file results. showFiles() also refreshes.
                this.exitSearch();
            } else {
                // Else don't exit the search
                this._preview.refresh();
            }

            if(this.getCurrentFile()) {
                // Necessary to scroll the file into view
                this._preview.select(this.getCurrentFile().hash);
            }
        }
    }

    /**
     * Simply sets the current file pointer to the new.
     * @param {ZettlrFile} newfile The new file's pointer.
     */
    setCurrentFile(newfile)
    {
        this._currentFile = newfile;
        // Also directly select it
        if(newfile !== null) {
            this._preview.select(newfile.hash);
        }
    }

    /**
     * Returns the current file's pointer.
     * @return {ZettlrFile} The file object.
     */
    getCurrentFile() { return this._currentFile; }

    /**
     * Returns the current directory's pointer.
     * @return {ZettlrDir} The dir object.
     */
    getCurrentDir() { return this._currentDir; }

    /**
     * Returns the language of the GUI.
     * @return {String} The language code.
     */
    getLocale() { return this._lang; }

    /**
     * Sets the GUI language
     * @param {String} lang locale code
     */
    setLocale(lang) { this._lang = lang; }

    /**
     * Sets the Aff-File contents
     * @param {String} affFile The file contents
     */
    setAff(affFile) { this._typoAff = affFile; }

    /**
     * Sets the Dic-File contents
     * @param {String} dicFile The file contents
     */
    setDic(dicFile) { this._typoDic = dicFile; }

    /**
     * Returns the toolbar object
     * @return {ZettlrToolbar} The current toolbar
     */
    getToolbar() { return this._toolbar; }

    /**
     * Returns the editor object
     * @return {ZettlrEditor} The editor instance
     */
    getEditor() { return this._editor; }

    /**
     * Returns the preview object
     * @return {ZettlrPreview} The preview list
     */
    getPreview() { return this._preview; }

    /**
     * Returns the body object
     * @return {ZettlrBody} The body instance
     */
    getBody() { return this._body; }

    /**
     * Returns the pomodoro
     * @return {ZettlrPomodoro} The pomodoro object
     */
    getPomodoro() { return this._pomodoro; }

    /**
     * Returns the current paths
     * @return {Object} The paths object
     */
    getPaths() { return this._paths; }

    /**
     * Returns the stats view
     * @return {ZettlrStatsView} The view instance
     */
    getStatsView() { return this._stats; }

    /**
     * Returns a one-dimensional array of all files in the current directory and
     * its subdirectories. The extensions are omitted!
     * @param  {Object} [obj=this.getCurrentDir()] The object to be searched in.
     * @param  {Array}  [arr=[]]                   The array containing file names
     * @return {Array}                            The array containing all file names
     */
    getFilesInDirectory(obj = this.getCurrentDir(), arr = [])
    {
        if(!obj) return arr;

        if(obj.type == 'directory') {
            for(let child of obj.children) {
                if(child.type == 'file') {
                    arr.push(path.basename(child.name, path.extname(child.name)));
                } else if(child.type == 'directory') {
                    arr = this.getFilesInDirectory(child, arr);
                }
            }
        } else if(obj.type == 'file') {
            arr.push(path.basename(obj.name, path.extname(child.name)));
        }

        return arr;
    }

    /**
     * Sends a command to Main (only used in ZettlrPreview for searching)
     * @param  {String} command The command to be sent
     * @param  {Mixed} content The content belonging to the sent command
     */
    send(command, content) { this._ipc.send(command, content); }

    /**
     * Simply indicates to main to set the modified flag.
     */
    setModified() { this._ipc.send('file-modified', {}); }

    /**
     * Can tell whether or not the editor is modified.
     * @return {Boolean} True if the editor's contents are modified.
     */
    isModified() { return !this.getEditor().isClean(); }
} // END CLASS
