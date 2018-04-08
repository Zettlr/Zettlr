/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrBody class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This is a model that represents all GUI elements that are
 *                  not controlled by one of the other Models (e.g. affect the
 *                  whole app)
 *
 * END HEADER
 */

const ZettlrCon             = require('./zettlr-context.js');
const ZettlrDialog          = require('./zettlr-dialog.js');
const ZettlrQuicklook       = require('./zettlr-quicklook.js');
const ZettlrNotification    = require('./zettlr-notification.js');
const ZettlrPopup           = require('./zettlr-popup.js');

/**
 * This class's duty is to handle everything that affects (or can potentially
 * occur over) the whole app window, such as dialogs (preferences), Quicklook
 * windows or popups. Among the tasks of this class is to bundle these together
 * for easy access so that we always know where to put such things.
 */
class ZettlrBody
{
    /**
     * Activate whatever we need
     * @param {ZettlrRenderer} parent The renderer main object
     */
    constructor(parent)
    {
        this._renderer = parent;
        this._menu = new ZettlrCon(this);
        this._dialog = new ZettlrDialog(this);
        this._spellcheckLangs = null; // This holds all available languages
        this._ql = []; // This holds all open quicklook windows
        this._n = []; // Holds all notifications currently displaying
        this._darkTheme = false; // Initial value; will be overwritten by init messages

        // Event listener for the context menu
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._menu.popup(e);
        }, false);

        document.addEventListener('dragover',function(event){
            event.preventDefault();
            return false;
        }, false);

        // On drop, tell the renderer to tell main that there's something to
        // handle.
        document.addEventListener('drop',(event) => {
            event.preventDefault();
            // Retrieve all paths
            let f = [];
            for(let i = 0; i < event.dataTransfer.files.length; i++) {
                f.push(event.dataTransfer.files.item(i).path);
            }
            this._renderer.handleDrop(f);
            return false;
        }, false);
    }

    /**
     * Display a small popup to ask for a new file name
     * @param  {ZettlrDir} dir A directory object
     * @return {void}     Nothing to return.
     */
    requestFileName(dir)
    {
        let cnt = $('<div>').html(
            `
            <form action="#" method="GET">
            <input type="text" class="small" value="${trans('dialog.file_new.value')}" placeholder="${trans('dialog.file_new.placeholder')}" name="name" required>
            </form>
            `
        );

        let popup = new ZettlrPopup(this, $('.button.file-new'), cnt, (form) => {
            if(form) {
                this._renderer.requestNewFile(form[0].value, dir.hash);
            }
        });
    }

    /**
     * Display a small popup for a new directory.
     * @param  {ZettlrDir} dir The parent directory object.
     * @return {void}     Nothing to return.
     */
    requestDirName(dir)
    {
        let cnt = $('<div>').html(
            `
            <form action="#" method="GET">
            <input type="text" class="small" value="${trans('dialog.dir_new.value')}" placeholder="${trans('dialog.dir_new.placeholder')}" name="name" required>
            </form>
            `
        );

        let popup = new ZettlrPopup(this, $('.button.directory-new'), cnt, (form) => {
            if(form) {
                this._renderer.requestNewDir(form[0].value, dir.hash);
            }
        });
    }

    /**
     * Display a small popup to ask for a new dir name for an already existing.
     * @param  {ZettlrDir} dir The directory to be renamed
     * @return {void}     Nothing to return.
     */
    requestNewDirName(dir)
    {
        let elem = $('#directories').find('li[data-hash="'+dir.hash+'"]').first();
        let cnt = $('<div>').html(
            `
            <form action="#" method="GET">
            <input type="text" class="small" value="${dir.name}" placeholder="${trans('dialog.dir_rename.placeholder')}" name="name" required>
            </form>
            `
        );

        let popup = new ZettlrPopup(this, elem, cnt, (form) => {
            if(form) {
                this._renderer.requestDirRename(form[0].value, dir.hash);
            }
        });
    }

    /**
     * Requests a new file name.
     * @param  {ZettlrFile} file The file to be renamed.
     * @return {void}      Nothing to return.
     */
    requestNewFileName(file)
    {
        let elem = '';
        if(this._renderer.getCurrentFile() != null && this._renderer.getCurrentFile().hash === file.hash) {
            elem = $('.button.file-rename');
        } else {
            elem = $('#preview').find('li[data-hash="'+file.hash+'"]').first();
            if(elem.length == 0) {
                // Obviously the file is standalone
                elem = $('#directories').find('div[data-hash="'+file.hash+'"]').first();
            }
        }

        let cnt = $('<div>').html(
            `
            <form action="#" method="GET">
            <input type="text" class="small" value="${file.name}" placeholder="${trans('dialog.file_rename.placeholder')}" name="name" required>
            </form>
            `
        );

        let popup = new ZettlrPopup(this, elem, cnt, (form) => {
            if(form) {
                this._renderer.requestFileRename(form[0].value, file.hash);
            }
        });
    }

    /**
     * Opens a quicklook window for a given file.
     * @param  {ZettlrFile} file The file to be loaded into the QuickLook
     * @return {void}      Nothing to return.
     */
    quicklook(file)
    {
        this._ql.push(new ZettlrQuicklook(this, file, this._darkTheme));
    }

    /**
     * This function is called by Quicklook windows on their destruction to
     * remove them from this array.
     * @param  {ZettlrQuicklook} zql The Quicklook that has requested its removal.
     * @return {Boolean}     True, if the call succeeded, or false.
     */
    qlsplice(zql)
    {
        let index = this._ql.indexOf(zql);
        if(index > -1) {
            this._ql.splice(index, 1);
            return true;
        }

        return false;
    }

    /**
     * Closes all quicklooks.
     * @return {ZettlrBody} Chainability.
     */
    closeQuicklook()
    {
        while(this._ql.length > 0) {
            // QuickLooks splice themselves from the array -> always close first
            this._ql[0].close();
        }

        return this;
    }

    /**
     * Display a small notifiation.
     * @param  {String} message What should the user be notified about?
     * n {ZettlrBody}         Chainability.
     */
    notify(message)
    {
        this._n.push(new ZettlrNotification(this, message, this._n.length));
        return this;
    }

    /**
     * Remove a notification from the array.
     * @param  {ZettlrNotification} ntf  The notification that wants itself removed.
     * @param  {Integer} oldH The old height of the notification.
     * @return {void}      Nothing to return.
     */
    notifySplice(ntf, oldH)
    {
        let index = this._n.indexOf(ntf);
        if(index > -1) {
            this._n.splice(index, 1);
        }

        for(let msg of this._n) {
            msg.moveUp(oldH);
        }
    }

    /**
     * Toggled the theme
     * @return {ZettlrBody} Chainability.
     */
    toggleTheme()
    {
        this._darkTheme = !this._darkTheme;
        // Toggle the Quicklook-window's style
        for(let ql of this._ql) {
            ql.toggleTheme();
        }

        // Also set the body to light/dark (needed for the scrollbars)
        $('body').toggleClass('dark');

        return this;
    }

    /**
     * Opens the exporting popup
     * @param  {ZettlrFile} file Which file should be exported?
     * @return {void}      Nothing to return.
     */
    displayExport(file)
    {
        // Create a popup
        let cnt = $('<div>').html(
            `
            <div class="btn-share htm" title="${trans('dialog.export.alt_html')}" data-ext="html" data-hash="${file.hash}">HTML</div>
            <div class="btn-share pdf" title="${trans('dialog.export.alt_pdf')}" data-ext="pdf" data-hash="${file.hash}">PDF</div>
            <div class="btn-share odt" title="${trans('dialog.export.alt_odt')}" data-ext="odt" data-hash="${file.hash}">ODT</div>
            <div class="btn-share docx" title="${trans('dialog.export.alt_docx')}" data-ext="docx" data-hash="${file.hash}">DOCX</div>
            `
        );
        let popup = new ZettlrPopup(this, $('.button.share'), cnt);

        $('.btn-share').click((e) => {
            this.requestExport(e.target);
            popup.close();
        });
    }

    /**
     * Open a new dialog for displaying the preferences.
     * @param  {Object} prefs An object containing all current config variables
     * @return {void}       Nothing to return.
     */
    displayPreferences(prefs)
    {
        this._dialog.init('preferences', prefs);
        this._dialog.open();
    }

    /**
     * Displays the update notification
     * @param  {Object} cnt An object containing information on the update.
     */
    displayUpdate(cnt)
    {
        this._dialog.init('update', cnt);
        this._dialog.open();
    }

    /**
     * Displays the about dialog
     */
    displayAbout()
    {
        this._dialog.init('about');
        this._dialog.open();
    }

    displayFormatting()
    {
        let cnt = `
        <div class="formatting">
        <a href="#" class="markdownHeading1">Heading 1</a>
        <a href="#" class="markdownHeading2">Heading 2</a>
        <a href="#" class="markdownHeading3">Heading 3</a>
        <a href="#" class="markdownHeading4">Heading 4</a>
        <a href="#" class="markdownHeading5">Heading 5</a>
        <a href="#" class="markdownHeading6">Heading 6</a>
        <a href="#" class="markdownBold">Bold</a>
        <a href="#" class="markdownItalic">Italic</a>
        <a href="#" class="markdownBlockquote">Blockquote</a>
        <a href="#" class="markdownLink">Link</a>
        <a href="#" class="markdownImage">Image</a>
        <a href="#" class="markdownCode">Code</a>
        <a href="#" class="markdownMakeOrderedList">Ordered List</a>
        <a href="#" class="markdownMakeUnorderedList">Itemized List</a>
        <a href="#" class="markdownDivider">Divider</a>
        <a href="#" class="insertFootnote">Footnote</a>
        <a href="#" class="removeFootnote">Remove footnote</a>
        </div>`;
        let popup = new ZettlrPopup(this, $('.button.formatting'), cnt);

        $('.formatting a').click((e) => {
            let cm = e.target.className;
            this._renderer.handleEvent('cm-command', cm);
            popup.close();
        });
    }

    /**
     * Requests the export of a file. Is called by the exporting buttons.
     * @param  {jQuery} elem A jQuery object representing the clicked button.
     * @return {void}      Nothing to return.
     */
    requestExport(elem)
    {
        // The element contains data-attributes containing all necessary
        // data for export.
        let ext = $(elem).attr('data-ext');
        let hash = $(elem).attr('data-hash');
        this._renderer.requestExport(hash, ext);
    }

    /**
     * Simply set the spellchecking languages. Needed for the preferences.
     * @param {array} langs An array containing all supported languages.
     */
    setSpellcheckLangs(langs)
    {
        this._spellcheckLangs = {};
        for(let l in langs) {
            // Default to false, will only be overwritten if a language is checked
            this._spellcheckLangs[l] = false;
        }
    }

    // This function gets only called by the dialog class with an array
    // containing all serialized form inputs and the dialog type
    /**
     * This function is called by the dialog class when the user saves settings.
     * @param  {String} dialog    The opened dialog. TODO: Not needed.
     * @param  {Array} res       An array containing all settings
     * @param  {Object} passedObj A passed object. TODO: Not needed anymore.
     * @return {void}           Nothing to return.
     */
    proceed(dialog, res, passedObj)
    {
        let pandoc     = '',
        pdflatex   = '',
        darkTheme  = false,
        snippets   = false,
        spellcheck = this._spellcheckLangs,
        app_lang = 'en_US',
        debug = false;

        for(let r of res) {
            if(r.name === 'pref-pandoc') {
                pandoc = r.value;
            } else if(r.name === 'pref-pdflatex') {
                pdflatex = r.value;
            } else if(r.name === 'pref-darkTheme') {
                darkTheme = true;
            } else if(r.name === 'pref-snippets') {
                snippets = true;
            } else if(r.name === 'spellcheck[]') {
                spellcheck[r.value] = true;
            } else if(r.name === 'app-lang') {
                app_lang = r.value;
            } else if(r.name === 'debug') {
                debug = true;
            }
        }

        if(dialog == 'preferences') {
            let cfg = {
                'pandoc': pandoc,
                'pdflatex': pdflatex,
                'darkTheme': darkTheme,
                'snippets': snippets,
                'spellcheck': spellcheck,
                'app_lang': app_lang,
                'debug': debug
            }
            this._renderer.saveSettings(cfg);
        }

        this._dialog.close();
    }

    /**
     * Needed by the dialog
     * @return {String} The locale String from ZettlrRenderer
     */
    getLocale() { return this._renderer.getLocale(); }

    /**
     * Returns the renderer
     * @return {ZettlrRenderer} The renderer object
     */
    getRenderer() { return this._renderer; }
}

module.exports = ZettlrBody;
