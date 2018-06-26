/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrExport class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The exporter is used to export markdown files into various
 *                  formats such as HTML, ODT, DOCX or PDF.
 *
 * END HEADER
 */

const {trans}       = require('../common/lang/i18n.js');
const {formatDate}  = require('../common/zettlr-helpers.js');
const {exec}        = require('child_process');
const path          = require('path');
const fs            = require('fs');
const showdown      = require('showdown');

/**
 * ZettlrExport is a stateless class that gets invoked via the constructor.
 */
class ZettlrExport
{
    /**
     * Is invoked on each export and calls all necessary functions from within.
     * @param {Zettlr} app     The app object (needed for occasional access of the configuration object or for showing errors)
     * @param {Object} options An object containing necessary configuration to export
     */
    constructor(app, options)
    {
        // First: Initialise the engine
        // Make the variables available to all functions
        this.app = app;
        this.options = options;
        this.tpl = '';
        this.command = '';
        this.showdown = null;
        // We already know where the file will end up
        this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + "." + this.options.format);
        // Intermediary file containing all content replacements et al.
        this.tempfile = path.join(this.options.dest, 'export.tmp');
        // If we have PDF export, we need a template file
        this.textpl = '';

        // Second make sure pandoc is installed. Without, only HTML is possible
        // through showdown.
        if(!this.options.pandoc && this.options.format != "html") {
            return app.window.prompt({
                type: 'error',
                title: trans('system.error.no_pandoc_title'),
                message: trans('system.error.no_pandoc_message')
            });
        }

        // No matter what, for pdf we always need pandoc + latex installed.
        if((this.options.format == 'pdf') && !this.options.pdflatex) {
            return app.window.prompt({
                type: 'error',
                title: trans('system.error.no_pdflatex_title'),
                message: trans('system.error.no_pdflatex_message', error)
            });
        }

        //  Third prepare the export (e.g., strip IDs, tags or other unnecessary stuff)
        this._prepareFile();

        if(this.options.format == 'pdf') {
            this._buildLatexTpl();
        }

        // Fourth defer to the respective functions.
        switch(options.format)
        {
            case 'html':
            this._prepareHTML();
            break;
            case 'odt':
            case 'docx':
            this._prepareWordProcessor();
            break;
            case 'pdf':
            this._preparePDF();
            break;
            default:
            app.notify('Unknown format: ' + options.format);
            break;
        }

        this._make();

    }

    /**
     * Perform necessary steps on the file such as replacing IDs or tags, if
     * wanted.
     * TODO: For PDF exports this function should also create the latex-template.
     */
    _prepareFile()
    {
        // First load the file.
        let cnt = this.options.file.withContent().content;

        // Second check if we should strip something, if yes, do so.
        if(this.app.getConfig().get('export.stripIDs')) {
            // Strip all ZKN-IDs in format @ID:
            cnt = cnt.replace(/[^\[\[]@ID:([^\s]*)/g, ''); // Regular expression from ZettlrFile class
        }

        if(this.app.getConfig().get('export.stripTags')) {
            // Strip all tags
            cnt = cnt.replace(/#[\d\w-]+/g, '');
        }

        if(this.app.getConfig().get('export.stripLinks') == 'full') {
            // Completely remove internal links
            cnt = cnt.replace(/\[\[.+?\]\]/g, ''); // Important: Non-greedy modifier needed to not strip out the whole text!
        } else if(this.app.getConfig().get('export.stripLinks') == 'unlink') {
            // Remove square brackets from internal links
            cnt = cnt.replace(/\[\[(.+?)\]\]/g, function(match, p1, offset, string) {
                return p1;
            });
        }

        // Finally, save as temporary file.
        fs.writeFileSync(this.tempfile, cnt, 'utf8');
    }

    /**
     * On PDF export only, this function is called to prepare the LaTeX-template file
     */
    _buildLatexTpl()
    {
        this.textpl = path.join(this.options.dest, 'template.latex');
        let pdf = this.options.pdf; // Retrieve the PDF options
        let cnt = fs.readFileSync(path.join(__dirname, './assets/export.tex'), 'utf8');
        // Do updates to the template
        // General options
        cnt = cnt.replace('%PAGE_NUMBERING%', pdf.pagenumbering); // gobble turns page numbering off

        // Page setup
        cnt = cnt.replace('%PAPER_TYPE%', pdf.papertype);
        cnt = cnt.replace('%TOP_MARGIN%', pdf.tmargin + pdf.margin_unit);
        cnt = cnt.replace('%RIGHT_MARGIN%', pdf.rmargin + pdf.margin_unit);
        cnt = cnt.replace('%BOTTOM_MARGIN%', pdf.bmargin + pdf.margin_unit);
        cnt = cnt.replace('%LEFT_MARGIN%', pdf.lmargin + pdf.margin_unit);

        // Font setup
        cnt = cnt.replace('%MAIN_FONT%', pdf.mainfont);
        cnt = cnt.replace('%LINE_SPACING%', pdf.lineheight);
        cnt = cnt.replace('%FONT_SIZE%', pdf.fontsize + 'pt');

        // Metadata
        cnt = cnt.replace('%PDF_TITLE%', this.options.title);
        cnt = cnt.replace('%PDF_SUBJECT%', this.options.title);
        cnt = cnt.replace('%PDF_AUTHOR%', this.options.author);
        cnt = cnt.replace('%PDF_KEYWORDS%', this.options.keywords);

        fs.writeFileSync(this.textpl, cnt, 'utf8');
    }

    /**
     * This function prepares HTML export of markdown files using showdown.
     */
    _prepareHTML()
    {
        // Create a new showdown converter w/ footnotes support
        this.showdown = new showdown.Converter({
            'tables': true,
            'requireSpaceBeforeHeadingText': true // Needed to not render tags at line beginning
        });
        this.showdown.setFlavor('github');
    }

    /**
     * Prepares the export via pandoc using a reference document (e.g., odt or docx)
     */
    _prepareWordProcessor()
    {
        // -s is the standalone flag
        this.tpl = '--reference-doc="' + path.join(this.options.tplDir, 'template.' + this.options.format) + '" -s';
        this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} -t ${this.options.format} -o "${this.targetFile}"`;
    }

    _preparePDF()
    {
        // TODO: In the future generate the template based on user's decisions.
        this.tpl = `--template="${this.textpl}"`;
        let pdfengine = '--pdf-engine=xelatex';// + this.options.pdfengine;
        this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} ${pdfengine} -o "${this.targetFile}"`;
    }

    /**
     * This function realises the export and opens the file externally with the
     * respective viewer.
     */
    _make()
    {
        if(this.options.format == 'html' && this.showdown != null) {
            // Simply write the target file ourselves. Therefore first convert
            // to HTML and insert into the template, then replace the variables.
            let file = fs.readFileSync(this.tempfile, 'utf8');
            file = this.showdown.makeHtml(file);
            file = fs.readFileSync(path.join(__dirname, './assets/export.tpl'), 'utf8').replace('%BODY%', file);
            file = file.replace('%TITLE%', this.options.file.name);
            file = file.replace('%DATE%', formatDate(new Date()));
            // Replace footnotes. As HTML is only meant for preview & quick prints,
            // it doesn't matter how exact it is. Doesn't need to get to pandoc's
            // abilities.
            file = file.replace(/\[\^([\d\w]+)\]: (.+)\n/g, function(match, p1, p2, offset, string) {
                return `<p><small><sup><a name="fn-${p1}" ></a><a href="#fnref-${p1}">${p1}</a></sup> ${p2}</small></p>`;
            });
            file = file.replace(/\[\^([\d\w]+)\]/g, function(match, p1, offset, string) {
                return `<sup><a name="fnref-${p1}"></a><a href="#fn-${p1}">${p1}</a></sup>`;
            });

            fs.writeFile(this.targetFile, file, 'utf8', (err) => {
                this._cleanup(); // Has to be done even on error
                if(err) {
                    return this._abort(err);
                }

                this._finish();
            });
            return;
        }

        if(!this.command || this.command.length == 0) {
            // No command given -> abort
            return;
        }

        exec(this.command, { 'cwd': this.options.dest }, (error, stdout, stderr) => {
            this._cleanup(); // Has to be done even on error
            if (error) {
                return this._abort(error);
            }

            this._finish();
        });
    }

    /**
     * Abort by showing an error prompt
     * @param  {String} [error=''] The error, if given
     */
    _abort(error = '')
    {
        this.app.window.prompt({
            type: 'error',
            title: trans('system.error.export_error_title'),
            message: trans('system.error.export_error_message', error)
        });
    }

    /**
     * Cleanup operations (such as removing the temporary files)
     */
    _cleanup()
    {
        // remove the temporary file and then open it externally. Also, show
        // a notification that the export is complete.
        fs.unlink(this.tempfile, (err) => {
            if(err) {
                this.app.notify(trans('system.error.export_temp_file', this.tempfile));
            }
        });

        // Remove LaTeX template file if given
        if(this.options.format == 'pdf') {
            fs.unlink(this.textpl, (err) => {
                if(err) {
                    this.app.notify(trans('system.error.export_temp_file', this.textpl));
                }
            });
        }
    }

    /**
     * Finish the export: Open the resulting file and notify of successful export.
     */
    _finish()
    {
        require('electron').shell.openItem(this.targetFile);
        this.app.notify(trans('system.export_success', this.options.format.toUpperCase()));
    }
}

module.exports = ZettlrExport;
