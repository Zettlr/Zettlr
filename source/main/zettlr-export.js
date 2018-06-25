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
    constructor(app, options)
    {
        // Make the variables available to all functions
        this.app = app;
        this.options = options;
        this.tpl = '';
        this.command = '';
        this.showdown = null;
        this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + "." + this.options.format);

        // First make sure pandoc is installed. Without, only HTML is possible
        // through showdown.
        if(!this.options.pandoc || this.options.format != "html") {
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

        // Now defer to the respective functions.
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
     * This function prepares HTML export of markdown files.
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

    _prepareWordProcessor()
    {
        // -s is the standalone flag
        this.tpl = '--reference-doc="' + path.join(this.options.tplDir, 'template.' + this.options.format) + '" -s';
        this.command = `pandoc "${this.options.file.path}" -f markdown ${this.tpl} -t ${this.options.format} -o "${this.targetFile}"`;
    }

    _preparePDF()
    {
        // TODO: In the future generate the template based on user's decisions.
        this.tpl = '--template="' + path.join(this.options.tplDir, 'template.latex') + '"';
        let pdfengine = '--pdf-engine=' + this.options.pdfengine;
        this.command = `pandoc "${this.options.file.path}" -f markdown ${this.tpl} -t ${this.options.format} ${pdfengine} -o "${this.targetFile}"`;
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
            let file = this.showdown.makeHtml(this.options.file.withContent().content);
            file = fs.readFileSync(path.join(__dirname, './export.tpl'), 'utf8').replace('%BODY%', file);
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
                if(err) {
                    this.app.window.prompt({
                        type: 'error',
                        title: trans('system.error.html_error_title'),
                        message: trans('system.error.html_error_message', err)
                    });
                    return;
                }

                // Open externally
                require('electron').shell.openItem(this.targetFile);
            });
            return;
        }

        if(!this.command || this.command.length == 0) {
            // No command given -> abort
            return;
        }

        exec(this.command, { 'cwd': this.options.dest }, (error, stdout, stderr) => {
            if (error) {
                this.app.window.prompt({
                    type: 'error',
                    title: trans('system.error.pandoc_error_title'),
                    message: trans('system.error.pandoc_error_message', error)
                });
                return;
            }

            // Open externally
            require('electron').shell.openItem(this.targetFile);
        });
    }
}

module.exports = ZettlrExport;
