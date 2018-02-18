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

const ZettlrCon = require('./zettlr-context.js');
const ZettlrDialog = require('./zettlr-dialog.js');
const ZettlrQuicklook = require('./zettlr-quicklook.js');
const ZettlrNotification = require('./zettlr-notification.js');
const ZettlrPopup = require('./zettlr-popup.js');

/**
 * ZettlrBody class
 */
class ZettlrBody
{
    /**
     * Activate whatever we need
     * @param {ZettlrRenderer} parent The renderer main object
     */
    constructor(parent)
    {
        this.parent = parent;
        this.menu = new ZettlrCon(this);
        this.dialog = new ZettlrDialog(this);
        this.spellcheckLangs = null; // This holds all available languages
        this.ql = []; // This holds all open quicklook windows
        this.n = []; // Holds all notifications currently displaying
        this.darkTheme = false; // Initial value; will be overwritten by init messages

        // Event listener for the context menu
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.menu.popup(e);
        }, false);

        // TESTING TODO
        document.addEventListener('dragover',function(event){
            event.preventDefault();
            // This event is fired every time a user moves ANYTHING from outside
            // the app onto the browser window. Which means here we can begin
            // to differentiate what it will be. If it's nothing we could
            // indicate it with a forbidden-cursor, or show a preview.
            // In the event.dataTransfer.files - object there is an array of
            // files and folders that are being dragged into the application.
            // console.log(event);
            return false;
        },false);

        document.addEventListener('drop',function(event){
            event.preventDefault();
            console.log(event.dataTransfer.files);
            return false;
        },false);
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
                this.parent.requestNewFile(form[0].value, dir.hash);
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
                this.parent.requestNewDir(form[0].value, dir.hash);
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
                this.parent.requestDirRename(form[0].value, dir.hash);
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
        if(this.parent.getCurrentFile() != null && this.parent.getCurrentFile().hash === file.hash) {
            elem = $('.button.file-rename');
        } else {
            elem = $('#preview').find('li[data-hash="'+file.hash+'"]').first();
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
                this.parent.requestFileRename(form[0].value, file.hash);
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
        this.ql.push(new ZettlrQuicklook(this, file, this.darkTheme));
    }

    /**
     * This function is called by Quicklook windows on their destruction to
     * remove them from this array.
     * @param  {ZettlrQuicklook} zql The Quicklook that has requested its removal.
     * @return {Boolean}     True, if the call succeeded, or false.
     */
    qlsplice(zql)
    {
        let index = this.ql.indexOf(zql);
        if(index > -1) {
            this.ql.splice(index, 1);
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
        while(this.ql.length > 0) {
            // QuickLooks splice themselves from the array -> always close first
            this.ql[0].close();
        }

        return this;
    }

    /**
     * Display a small notifiation.
     * @param  {String} message What should the user be notified about?
     * @return {ZettlrBody}         Chainability.
     */
    notify(message)
    {
        this.n.push(new ZettlrNotification(this, message, this.n.length));
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
        let index = this.n.indexOf(ntf);
        if(index > -1) {
            this.n.splice(index, 1);
        }

        for(let msg of this.n) {
            msg.moveUp(oldH);
        }
    }

    /**
     * Toggled the theme
     * @return {ZettlrBody} Chainability.
     */
    toggleTheme()
    {
        this.darkTheme = !this.darkTheme;
        // Toggle the Quicklook-window's style
        for(let ql of this.ql) {
            ql.toggleTheme();
        }

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
        this.dialog.init('preferences', prefs);
        this.dialog.open();
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
        this.parent.requestExport(hash, ext);
    }

    /**
     * Simply set the spellchecking languages. Needed for the preferences.
     * @param {array} langs An array containing all supported languages.
     */
    setSpellcheckLangs(langs)
    {
        this.spellcheckLangs = {};
        for(let l in langs) {
            // Default to false, will only be overwritten if a language is checked
            this.spellcheckLangs[l] = false;
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
        let name   = '',
        pandoc     = '',
        pdflatex   = '',
        darkTheme  = '',
        snippets   = '',
        spellcheck = this.spellcheckLangs,
        app_lang = 'en_US',
        debug = '';

        for(let r of res) {
            // The four prompts will have an input name="name"
            if(r.name === 'name') {
                name = r.value;
            } else if(r.name === 'pref-pandoc') {
                pandoc = r.value;
            } else if(r.name === 'pref-pdflatex') {
                pdflatex = r.value;
            } else if(r.name === 'pref-darkTheme') {
                darkTheme = (r.value === 'yes') ? true : false;
            } else if(r.name === 'pref-snippets') {
                snippets = (r.value === 'yes') ? true : false;
            } else if(r.name === 'spellcheck[]') {
                spellcheck[r.value] = true;
            } else if(r.name === 'app-lang') {
                app_lang = r.value;
            } else if(r.name === 'debug') {
                debug = (r.value === 'yes') ? true : false;
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
            this.parent.saveSettings(cfg);
        }

        this.dialog.close();
    }
}

module.exports = ZettlrBody;
