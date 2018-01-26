// This file contains a class that spits out templates for the main dialogs

const fs = require('fs');
const path = require('path');
const {trans} = require('../common/lang/i18n.js');

function DialogError(msg = '') {
    this.name = trans('dialog.error.name');
    this.message = trans('dialog.error.message', msg);
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
            throw new DialogError(trans('dialog.error.no_init'));
        }

        this.container.addClass('blur');
        this.body.append(this.modal);

        // Adjust the margins
        let dialog = this.modal.find('.dialog').first();
        let diaH = dialog.outerHeight();
        let winH = $(window).height();

        if(diaH < winH) {
            let margin = (winH-diaH) / 2;
            dialog.css('margin-top', margin + "px");
            dialog.css('margin-bottom', margin + "px");
        } else {
            dialog.css('margin-top', '15%'); // Otherwise enable scrolling
            dialog.css('margin-bottom', '15%');
        }

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
            throw new DialogError(trans('dialog.error.no_data', obj));
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
            let spellcheck = '';
            for(let l in obj.spellcheck) {
                let sel = (obj.spellcheck[l]) ? 'checked="checked"' : '';
                spellcheck += '<div>';
                spellcheck += `<input type="checkbox" value="${l}" ${sel} name="spellcheck[]" id="${l}"><label for="${l}">${trans('dialog.preferences.app_lang.'+l)}</label>`;
                spellcheck += '</div>';
            }
            replacements.push('%SPELLCHECK%|' + spellcheck);
            let lang_selection = '';
            for(let l of obj.supportedLangs) {
                if(l === this.parent.parent.getLocale()) {
                    lang_selection += `<option value="${l}" selected="selected">${trans('dialog.preferences.app_lang.'+l)}</option>`;
                } else {
                    lang_selection += `<option value="${l}">${trans('dialog.preferences.app_lang.'+l)}</option>`;
                }
            }
            replacements.push('%APP_LANG%|' + lang_selection)
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
                pdflatexexp = this.get('dialog-export-pdf', replacements);
            } else {
                pdflatexerror = this.get('dialog-export-no-pdflatex');
            }
            replacements.push('%PDFLATEXEXPORT%|'+pdflatexexp);
            replacements.push('%PDFLATEXERROR%|'+pdflatexerror);
            if(obj.pandoc) {
                pandocexp = this.get('dialog-export-formats', replacements);
            } else {
                pandocerror = this.get('dialog-export-no-pandoc');
            }
            replacements.push('%PANDOCERROR%|'+pandocerror);
            replacements.push('%EXPORTS%|'+pandocexp);
            break;

            default:
            throw new DialogError(trans('dialog.error.unknown_dialog', dialog));
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
        $('#odt' ).on('dblclick', (e) => { this.parent.requestExport($('#odt' )); });
        $('#pdf' ).on('dblclick', (e) => { this.parent.requestExport($('#pdf' )); });
    }

    // Reads and return a template file, applying replacements if given
    get(template, replacements = [])
    {
        let p = path.join(__dirname, 'assets', 'tpl', template + '.htm');

        try {
            let stat = fs.lstatSync(p);
        } catch (e) {
            throw new DialogError(trans('dialog.error.no_template', template));
        }

        let cnt = fs.readFileSync(p, { encoding: 'utf8' });

        // Translation-strings:
        let i18n = this.getLanguageTable(cnt);
        replacements = i18n.concat(replacements);

        // Replace variables
        for(let r of replacements) {
            r = r.split('|');
            cnt = cnt.replace(new RegExp(r[0], 'g'), r[1]);
        }

        return cnt;
    }

    // This function creates a replacement table for all language strings that
    // should be translated.
    getLanguageTable(text)
    {
        // How it works: In the template files are replacement strings in the
        // following format:
        // %i18n.<dialog>.<stringidentifier>%
        // Benefit: We can programmatically create the array based on the
        // JSON values of trans, because the i18n-placeholder exactly matches
        // a string!

        let replacements = [];

        // First find all i18n-strings
        let regex = /%i18n\.(.+?)%/g, result, i18n_strings = [];
        while(result = regex.exec(text)) {
            i18n_strings.push(result[0]);
        }

        for(let str of i18n_strings) {
            let lang_opt = str.substr(0, str.length-1).split('.').slice(1); // Omit first index
            let obj = global.i18n.dialog;

            for(let x of lang_opt) {
                // Navigate into the object
                if(obj.hasOwnProperty(x)) {
                    obj = obj[x];
                } else {
                    // Doesn't exist, throw back the string itself
                    obj = lang_opt.join('.');
                    break;
                }
            }
            replacements.push(str + '|' + obj);
        }

        return replacements;
    }
}

module.exports = ZettlrDialog;
