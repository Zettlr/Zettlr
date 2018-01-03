/* THIS CLASS CONTROLS THE WHOLE BODY FOR DISPLAYING MODALS ETC */

const ZettlrCon = require('./zettlr-context.js');

function ZettlrBody(parent)
{
    this.parent = parent;
    this.div;
    this.modal;
    this.container;
    this.menu;

    this.init = function() {
        this.div = $('body');
        this.container = $('#container');
        this.modal = $('<div>').addClass('modal');

        this.menu = new ZettlrCon(this);

        // Event listener for the context menu
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.menu.popup(e);
        }, false);
    };

    // Display a modal to ask for a new file name.
    this.requestFileName = function(dir) {
        // Looks nice to blur the container
        this.container.addClass('blur');
        this.div.append(this.modal);

        this.modal.html(this.getFileForm(dir));
        // Select the "untitled"-content
        input = this.modal.find('input');
        dlg = this.modal.find('.dialog');
        input.select();

        // Activate the input
        let that = this;
        input.on('keyup', (e) => {
            if(e.which == 27) { // ESC
                that.abort();
            } else if(e.which == 13) { // ENTER
                that.proceed('file', dir.hash);
            }
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        dlg.on('click', (e) => { e.stopPropagation(); });

        this.modal.on('click', (e) => {
            that.abort();
        });
    };

    this.requestDirName = function(dir) {
        this.container.addClass('blur');
        this.div.append(this.modal);

        this.modal.html(this.getDirForm(dir));
        // Select the "untitled"-content
        input = this.modal.find('input');
        dlg = this.modal.find('.dialog');
        input.select();

        // Activate the input
        let that = this;
        input.on('keyup', (e) => {
            if(e.which == 27) { // ESC
                that.abort();
            } else if(e.which == 13) { // ENTER
                that.proceed('dir', dir.hash);
            }
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        dlg.on('click', (e) => { e.stopPropagation(); });

        this.modal.on('click', (e) => {
            that.abort();
        });
    };

    // TODO: Rewrite, lots of double code
    this.requestNewDirName = function(dir) {
        this.container.addClass('blur');
        this.div.append(this.modal);

        this.modal.html(this.getDirRenameForm(dir));

        input = this.modal.find('input');
        dlg = this.modal.find('.dialog');
        input.select();

        // Activate the input
        let that = this;
        input.on('keyup', (e) => {
            if(e.which == 27) { // ESC
                that.abort();
            } else if(e.which == 13) { // ENTER
                that.proceed('dirrename', dir.hash);
            }
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        dlg.on('click', (e) => { e.stopPropagation(); });

        this.modal.on('click', (e) => {
            that.abort();
        });
    };

    this.requestNewFileName = function(file) {
        this.container.addClass('blur');
        this.div.append(this.modal);

        this.modal.html(this.getFileRenameForm(file));

        input = this.modal.find('input');
        dlg = this.modal.find('.dialog');
        input.select();

        // Activate the input
        let that = this;
        input.on('keyup', (e) => {
            if(e.which == 27) { // ESC
                that.abort();
            } else if(e.which == 13) { // ENTER
                that.proceed('filerename', file.hash);
            }
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        dlg.on('click', (e) => { e.stopPropagation(); });

        this.modal.on('click', (e) => {
            that.abort();
        });
    };

    this.displayExport = function(file) {
        this.container.addClass('blur');
        this.div.append(this.modal);

        this.modal.html(this.getExportForm(file));

        dlg = this.modal.find('.dialog');

        let that = this;

        // Activate event listeners
        // I need to use the IDs directly because (this) is always deferred
        // by jQuery to represent ZettlrBody instead of the actual clicked item.
        $('#html').on('dblclick', (e) => {
            that.requestExport($('#html'));
        });

        $('#docx').on('dblclick', (e) => {
            that.requestExport($('#docx'));
        });

        $('#odt').on('dblclick', (e) => {
            that.requestExport($('#odt'));
        });

        $('#pdf').on('dblclick', (e) => {
            that.requestExport($('#pdf'));
        });

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        dlg.on('click', (e) => { e.stopPropagation(); });

        this.modal.on('click', (e) => {
            that.abort();
        });
    };

    // Display the preferences window
    this.displayPreferences = function(prefs) {
        this.container.addClass('blur');
        this.div.append(this.modal);

        this.modal.html(this.getPreferencesPane(prefs));

        dlg = this.modal.find('.dialog');

        let that = this;

        // Don't bubble so that the user may click on the dialog without
        // closing the whole modal.
        dlg.on('click', (e) => { e.stopPropagation(); });

        $('#pref-cancel').on('click', (e) => {
            that.abort();
        });

        $('#pref-save').on('click', (e) => {
            that.saveSettings();
        });

        this.modal.on('click', (e) => {
            that.abort();
        });

        dlg.find('input').first().focus();
    };

    this.requestExport = function(elem) {
        // The element contains data-attributes containing all necessary
        // data for export.
        ext = $(elem).attr('data-ext');
        hash = $(elem).attr('data-hash');
        this.parent.requestExport(hash, ext);
    };

    this.abort = function() {
        // Abort the new stuff.
        this.container.removeClass('blur');
        this.modal.detach();
        this.modal.html('');
    };

    this.saveSettings = function() {
        let cfg = {
            'pandoc': $('#pref-pandoc').val(),
            'pdflatex': $('#pref-pdflatex').val(),
            'darkTheme': $('#pref-darkTheme').is(':checked'),
            'snippets': $('#pref-snippets').is(':checked')
        }
        this.parent.saveSettings(cfg);
        this.abort();
    };

    this.proceed = function(action, hash = null) {
        // Get the value, "abort" and notify host process.
        let val = this.modal.find('input').val();
        this.abort();

        if(action == 'file') {
            this.parent.requestNewFile(val, hash);
        } else if(action == 'dir') {
            this.parent.requestNewDir(val, hash);
        } else if(action == 'dirrename') {
            this.parent.requestDirRename(val, hash);
        } else if(action == 'filerename') {
            this.parent.requestFileRename(val, hash);
        }
    };

    this.getFileForm = function(dir) {
        return `<div class="dialog">
        <h1>Create File</h1>
        <p>Please provide a filename.<br>
        The file will be stored in <strong>${dir.path}</strong></p>
        <input type="text" placeholder="File name" autofocus="autofocus" value="Untitled">
        </div>
        `;
    };

    this.getDirForm = function(dir) {
        return `<div class="dialog">
        <h1>Create Directory</h1>
        <p>Please provide a new directory name.<br>
        The directory will be stored in <strong>${dir.path}</strong></p>
        <input type="text" placeholder="Directory name" autofocus="autofocus" value="Untitled">
        </div>
        `;
    };

    this.getDirRenameForm = function(dir) {
        return `<div class="dialog">
        <h1>Rename Directory</h1>
        <p>Please provide a new directory name.<br>
        The directory in <strong>${dir.path}</strong> and all its files will be moved accordingly.</p>
        <input type="text" placeholder="Directory name name" autofocus="autofocus" value="${dir.name}">
        </div>
        `;
    };

    this.getFileRenameForm = function(file) {
        return `<div class="dialog">
        <h1>Rename File</h1>
        <p>Please provide a new file name.<br>
        The file in <strong>${file.path}</strong> will be moved accordingly.</p>
        <input type="text" placeholder="File name" autofocus="autofocus" value="${file.name}">
        </div>
        `;
    };

    this.getExportForm = function(file) {
        newname = file.name.substr(0, file.name.lastIndexOf('.'));
        html = newname + ".html";
        docx = newname + ".docx";
        odt =  newname + ".odt";
        pdf = newname + ".pdf";

        modal = '<div class="dialog">';
        modal += '<h1>Export file</h1>';
        if(!this.parent.pandoc) {
            modal += '<div class="error">No pandoc-binary was found on this system. Please <a href="https://pandoc.org/installing.html" target="_blank">install Pandoc</a>. It\'s free!</div>';
        }

        if(!this.parent.pdflatex) {
            modal += '<div class="error">No PDFLaTeX-binary was found on this system. Please install LaTeX to enable PDF export.<br>';
            modal += '<ul><li><strong>macOS:</strong> <a href="https://www.tug.org/mactex/morepackages.html" target="_blank">BasicTeX</a></li>';
            modal += '<li><strong>Windows:</strong> <a href="https://miktex.org/download" target="_blank">MikTeX</a></li>';
            modal += '<li><strong>Linux:</strong> <a href="https://wiki.ubuntuusers.de/TeX_Live/" target="_blank">TeX Live</a></li>';
            modal += '</ul>';
            modal += '</div>';
        }

        modal += `
        <p>You are about to export <strong>${file.name}</strong></p>
        <p>Just double click the file type you want to export. It will open
        automatically in the program of your choice, from where you can save it
        wherever you want.</p>`;

        if(this.parent.pandoc) {
            modal += `
            <div class="export_files">
            <div id="html" data-hash="${file.hash}" data-ext="html">
            <img src="img/html.png" alt="Export as HTML" title="HTML">
            <span class="filename">${html}</span>
            </div>

            <div id="odt" data-hash="${file.hash}" data-ext="odt">
            <img src="img/odt.png" alt="Export as ODT" title="ODT">
            <span class="filename">${odt}</span>
            </div>

            <div id="docx" data-hash="${file.hash}" data-ext="docx">
            <img src="img/doc.png" alt="Export as DOCX" title="DOCX">
            <span class="filename">${docx}</span>
            </div>`;

            if(this.parent.pdflatex) {
                modal += `
                <div id="pdf" data-hash="${file.hash}" data-ext="pdf">
                <img src="img/pdf.png" alt="Export as PDF" title="PDF">
                <span class="filename">${pdf}</span>
                </div>`;
            }

            modal += '</div>';
        }

        modal += '</div>';

        return modal;
    };

    this.getPreferencesPane = function(prefs) {
        dark = (prefs.darkTheme) ? 'checked="checked"' : '';
        snippets = (prefs.snippets) ? 'checked="checked"' : '';

        return `<div class="dialog">
        <h1>Preferences</h1>
        <p>Edit your preferences here.</p>
        <hr>
        <label for="pref-pandoc">Path to the pandoc command. Only change if you
        installed pandoc but Zettlr is unable to find it.</label>
        <input type="text" id="pref-pandoc" placeholder="Default: pandoc" value="${prefs.pandoc}">
        <label for="pref-pdflatex">Path to the pdflatex command. Only change if
        you installed a LaTeX distribution but Zettlr is unable to locate it.</label>
        <input type="text" id="pref-pdflatex" placeholder="Default: pdflatex" value="${prefs.pdflatex}">

        <div>
        <input type="checkbox" id="pref-darkTheme" ${dark}>
        <label for="pref-darkTheme">Dark Theme?</label>
        </div>
        <div>
        <input type="checkbox" id="pref-snippets" ${snippets}>
        <label for="pref-snippets">Display snippets?</label>
        </div>
        <button id="pref-save">Save</button>
        <button id="pref-cancel">Cancel</button>
        </div>`;
    };
}

module.exports = ZettlrBody;
