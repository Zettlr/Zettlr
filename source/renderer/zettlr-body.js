/* THIS CLASS CONTROLS THE WHOLE BODY FOR DISPLAYING MODALS ETC */

const ZettlrCon = require('./zettlr-context.js');
const ZettlrDialog = require('./zettlr-dialog.js');

class ZettlrBody
{
    constructor(parent)
    {
        this.parent = parent;
        this.menu = new ZettlrCon(this);
        this.dialog = new ZettlrDialog(this);

        // Event listener for the context menu
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.menu.popup(e);
        }, false);
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

    // This function gets only called by the dialog class with an array
    // containing all serialized form inputs and the dialog type
    proceed(dialog, res, passedObj)
    {
        let name      = '',
            pandoc    = '',
            pdflatex  = '',
            darkTheme = '',
            snippets  = '';

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
                'snippets': snippets
            }
            this.parent.saveSettings(cfg);
        }

        this.dialog.close();
    }
}

module.exports = ZettlrBody;
