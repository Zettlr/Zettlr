/* THIS CLASS CONTROLS THE WHOLE BODY FOR DISPLAYING MODALS ETC */

const ZettlrCon = require('./zettlr-context.js');
const ZettlrDialog = require('./zettlr-dialog.js');
const ZettlrQuicklook = require('./zettlr-quicklook.js');
const ZettlrNotification = require('./zettlr-notification.js');

class ZettlrBody
{
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

    // Display a modal to ask for a new file name.
    requestFileName(dir)
    {
        // Init dialog and show it
        this.dialog.init('file-new', dir);
        this.dialog.open();
    }

    requestDirName(dir)
    {
        this.dialog.init('dir-new', dir);
        this.dialog.open();
    }

    requestNewDirName(dir)
    {
        this.dialog.init('dir-rename', dir);
        this.dialog.open();
    }

    requestNewFileName(file)
    {
        this.dialog.init('file-rename', file);
        this.dialog.open();
    }

    quicklook(file)
    {
        this.ql.push(new ZettlrQuicklook(this, file, this.darkTheme));
    }

    // This function gets called only by ZettlrQuicklook-objects on their
    // destruction to remove it from the ql-array.
    qlsplice(zql)
    {
        let index = this.ql.indexOf(zql);
        if(index > -1) {
            this.ql.splice(index, 1);
        }
    }

    // Close all quicklooks
    closeQuicklook()
    {
        while(this.ql.length > 0) {
            // QuickLooks splice themselves from the array -> always close first
            this.ql[0].close();
        }
    }

    notify(message)
    {
        this.n.push(new ZettlrNotification(this, message, this.n.length));
    }

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

    toggleTheme()
    {
        this.darkTheme = !this.darkTheme;
        // Toggle the Quicklook-window's style
        for(let ql of this.ql) {
            ql.toggleTheme();
        }
    }

    displayExport(file)
    {
        let options = {
            'name': file.name,
            'hash': file.hash,
            'pdflatex': this.parent.pdflatex,
            'pandoc': this.parent.pandoc
        };

        this.dialog.init('export', options);
        this.dialog.open();
    }

    // Display the preferences window
    displayPreferences(prefs)
    {
        this.dialog.init('preferences', prefs);
        this.dialog.open();
    }

    requestExport(elem)
    {
        // The element contains data-attributes containing all necessary
        // data for export.
        let ext = $(elem).attr('data-ext');
        let hash = $(elem).attr('data-hash');
        this.parent.requestExport(hash, ext);
    }

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
    proceed(dialog, res, passedObj)
    {
        let name   = '',
        pandoc     = '',
        pdflatex   = '',
        darkTheme  = '',
        snippets   = '',
        spellcheck = this.spellcheckLangs,
        app_lang = 'en_US';

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
            }
        }

        if(dialog == 'file-new') {
            this.parent.requestNewFile(name, passedObj.hash);
        } else if(dialog == 'dir-new') {
            this.parent.requestNewDir(name, passedObj.hash);
        } else if(dialog == 'dir-rename') {
            this.parent.requestDirRename(name, passedObj.hash);
        } else if(dialog == 'file-rename') {
            this.parent.requestFileRename(name, passedObj.hash);
        } else if(dialog == 'preferences') {
            let cfg = {
                'pandoc': pandoc,
                'pdflatex': pdflatex,
                'darkTheme': darkTheme,
                'snippets': snippets,
                'spellcheck': spellcheck,
                'app_lang': app_lang
            }
            this.parent.saveSettings(cfg);
        }

        this.dialog.close();
    }
}

module.exports = ZettlrBody;
