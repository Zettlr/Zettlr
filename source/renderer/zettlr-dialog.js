// This file contains a class that spits out templates for the main dialogs

const fs = require('fs');
const path = require('path');

function DialogError(msg = '') {
    this.name = 'Dialog Error';
    this.message = 'Could not generate dialog! ' + msg;
}

class ZettlrDialog
{
    constructor(parent = null)
    {
        // Used to retrieve some configuration options
        this.parent = parent;
        this.body = $('body');
        this.container = $('#container');
        this.modal = $('<div>').addClass('modal');
        this.dlg = null;
        this.passedObj = null;
    }

    // Show the dialog
    open()
    {
        if(!this.isInitialized()) {
            throw new DialogError('The dialog has not been initialized!');
        }

        this.container.addClass('blur');
        this.body.append(this.modal);

        // Activate event listeners
        this.activate();
    }

    // Close the dialog
    close()
    {
        this.modal.detach();
        this.container.removeClass('blur');
        this.modal.html('');
        this.dlg = null;
        this.passedObj = null;
    }

    isInitialized()
    {
        return (this.dlg !== null);
    }

    // This generates the dialog prior to showing (i.e., set the modal's html)
    init(dialog, obj = null)
    {
        // POSSIBLE DIALOGS:
        //
        // file-new
        // file-rename
        // dir-new
        // dir-rename
        // preferences
        // export

        if(!obj) {
            throw new DialogError('Could not init dialog. Data was ' + obj + '.');
        }

        this.passedObj = obj;
        this.dlg = dialog;

        let replacements = [];
        switch(dialog) {
            case 'file-new':
            case 'dir-new':
            case 'file-rename':
            case 'dir-rename':
            replacements.push('%PATH%|' + obj.path);
            replacements.push('%NAME%|' + obj.name);
            break;

            case 'preferences':
            let dark = (obj.darkTheme) ? 'checked="checked"' : '';
            let snippets = (obj.snippets) ? 'checked="checked"' : '';
            replacements.push('%DARK%|' + dark);
            replacements.push('%SNIPPETS%|' + snippets);
            replacements.push('%PANDOC%|' + obj.pandoc);
            replacements.push('%PDFLATEX%|' + obj.pdflatex);
            break;

            case 'export':
            obj.name = obj.name.substr(0, obj.name.lastIndexOf('.'));
            replacements.push('%NAME%|'+obj.name);
            replacements.push('%HASH%|'+obj.hash);

            let pdflatexexp = '';
            let pandocexp = '';
            let pandocerror = '';
            let pdflatexerror = '';
            if(obj.pdflatex) {
                pdflatexexp = this.get('dialog-pdflatex-export', replacements);
            } else {
                pdflatexerror = this.get('dialog-no-pdflatex');
            }
            replacements.push('%PDFLATEXEXPORT%|'+pdflatexexp);
            replacements.push('%PDFLATEXERROR%|'+pdflatexerror);
            if(obj.pandoc) {
                pandocexp = this.get('dialog-exports', replacements);
            } else {
                pandocerror = this.get('dialog-no-pandoc');
            }
            replacements.push('%PANDOCERROR%|'+pandocerror);
            replacements.push('%EXPORTS%|'+pandocexp);
            break;

            default:
            throw new DialogError('The requested dialog does not exist: ' + dialog);
            break;
        }

        this.modal.html(this.get('dialog-' + dialog, replacements));
    }

    activate()
    {
        // Select the "untitled"-content
        let form = this.modal.find('form#dialog');
        form.find('input').first().select();

        // Activate the form to be submitted
        form.on('submit', (e) => {
            e.preventDefault();
            // Give the ZettlrBody object the results
            // Form: dialog type, values, the originally passed object
            this.parent.proceed(this.dlg, form.serializeArray(), this.passedObj);
        });

        // Abort integration if an abort button is given
        form.find('button#abort').on('click', (e) => {
            this.close();
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        this.modal.find('.dialog').on('click', (e) => { e.stopPropagation(); });

        // Abort on click
        this.modal.on('click', (e) => { this.close(); });

        // Activate event listeners on the exporting divs if present
        $('#html').on('dblclick', (e) => { this.parent.requestExport($('#html')); });
        $('#docx').on('dblclick', (e) => { this.parent.requestExport($('#docx')); });
        $('#odt').on('dblclick', (e) => { this.parent.requestExport($('#odt')); });
        $('#pdf').on('dblclick', (e) => { this.parent.requestExport($('#pdf')); });
    }

    // Reads and return a template file, applying replacements if given
    get(template, replacements = [])
    {
        let p = path.join(__dirname, 'assets/tpl', template + '.htm');

        try {
            let stat = fs.lstatSync(p);
        } catch (e) {
            throw new DialogError('Could not find dialog template.');
        }

        let cnt = fs.readFileSync(p, { encoding: 'utf8' });

        // Replace variables
        for(let r of replacements) {
            r = r.split('|');
            cnt = cnt.replace(new RegExp(r[0], 'g'), r[1]);
        }

        return cnt;
    }
}

module.exports = ZettlrDialog;
