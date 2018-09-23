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

const { trans } = require('../common/lang/i18n.js')
const { formatDate } = require('../common/zettlr-helpers.js')
const { exec } = require('child_process')
const commandExists = require('command-exists').sync // Need to use here because we cannot rely on the config's availability
const path = require('path')
const fs = require('fs')
const showdown = require('showdown')

/**
 * Error object constructor.
 * @param       {String} msg              The message
 * @param       {String} [name='Exporting error']       The name of the error.
 * @constructor
 */
function ExportError (msg, name = 'Exporting error') {
  this.name = name
  this.message = msg
}

/**
 * ZettlrExport is a stateless class that gets invoked via the constructor.
 * TODO: Failsafe-checks for options!
 */
class ZettlrExport {
  /**
   * Is invoked on each export and calls all necessary functions from within.
   *
   * The option object should have the following design (some options don't need
   * to be given on certain exports):
   *
   * options = {
   *     'file': {
   *         'path': "The source path",
   *         'name': "The name only",
   *         'read': "function that returns the contents"
   *     },
   *     'dest': "The target directory",
   *     'format': "The format to which to export, can be pdf, odt, docx or html"
   *     'stripIDs': Should IDs be stripped?
   *     'stripTags': Should tags be stripped?
   *     'stripLinks': false, unlink, full
   *     'pdf': {
   *         'pagenumbering': 'numbering',
   *         'papertype': 'Papertype to be used',
   *         'margin_unit': 'cm, mm, pt or something for xelatex to use',
   *         'tmargin': 'Top page margin',
   *         'rmargin': 'Right page margin',
   *         'bmargin': 'Bottom page pargin',
   *         'lmargin': 'Left page margin',
   *         'mainfont': 'main font to use',
   *         'lineheight': 'float number',
   *         'fontsize': 'integer',
   *         'toc': 'Should a table of contents be generated?',
   *         'tocDepth': 'Level of headings to be evaluated: 1-6'
   *     }
   *     'title': "Title of the document",
   *     'author': "Author of the document",
   *     'keywords': "Keywords, separated by comma",
   *     'tplDir': "Where are the docx and odt templates?"
   * }
   * @param {Object} options An object containing necessary configuration to export
   */
  constructor (options) {
    // First: Initialise the engine
    // Make the variables available to all functions
    this.options = options
    this.tpl = ''
    this.command = ''
    this.showdown = null
    // We already know where the file will end up (on some exports this will
    // be overwritten by the prepare-command).
    this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + '.' + this.options.format)
    // Intermediary file containing all content replacements et al.
    this.tempfile = path.join(this.options.dest, 'export.tmp')
    // If we have PDF export, we need a template file
    this.textpl = ''

    // Second make sure pandoc is installed. Without, only HTML is possible
    // through showdown.
    if (!commandExists('pandoc') && this.options.format !== 'html') {
      throw new ExportError(trans('system.error.no_pandoc_message'), trans('system.error.no_pandoc_title'))
    }

    // No matter what, for pdf we always need pandoc + latex installed.
    if ((this.options.format === 'pdf') && !commandExists('xelatex')) {
      throw new ExportError(trans('system.error.no_xelatex_message'), trans('system.error.no_xelatex_title'))
    }

    // Necessary evaluations
    if (!this.options.pdf.hasOwnProperty('toc')) {
      this.options.pdf.toc = false
    }
    if (!this.options.pdf.hasOwnProperty('tocDepth')) {
      this.options.pdf.tocDepth = 0
    }
    if (!this.options.pdf.hasOwnProperty('titlepage')) {
      this.options.pdf.titlepage = false
    }

    //  Third prepare the export (e.g., strip IDs, tags or other unnecessary stuff)
    this._prepareFile()

    if (this.options.format === 'pdf') {
      this._buildLatexTpl()
    }

    // Fourth defer to the respective functions.
    switch (this.options.format) {
      case 'html':
        this._prepareHTML()
        break
      case 'odt':
      case 'docx':
        this._prepareWordProcessor()
        break
      case 'pdf':
        this._preparePDF()
        break
      case 'revealjs-beige':
      case 'revealjs-black':
      case 'revealjs-league':
      case 'revealjs-moon':
      case 'revealjs-serif':
      case 'revealjs-sky':
      case 'revealjs-solarized':
      case 'revealjs-white':
        // For revealjs extract the wanted theme so that the finalise method
        // can apply it.
        this.options.revealJSStyle = this.options.format.substr(9)
        this.options.format = this.options.format.substr(0, 8)
        // fall through
      case 'rst':
      case 'rtf':
      case 'latex':
      case 'plain':
      case 'org':
      case 'textile':
      case 'mediawiki':
        this._prepareStandardExport()
        break
      default:
        throw ExportError('Unknown format: ' + this.options.format)
    }

    this._make()
  }

  /**
   * Perform necessary steps on the file such as replacing IDs or tags, if
   * wanted.
   */
  _prepareFile () {
    // First load the file.
    let cnt = this.options.file.read({ 'absoluteImagePaths': true })

    // Second check if we should strip something, if yes, do so.
    if (this.options.stripIDs) {
      // Strip all ZKN-IDs in the pattern given by the user
      cnt = cnt.replace(new RegExp(global.config.get('zkn.idRE'), 'g'), '')
    }

    if (this.options.stripTags) {
      // Strip all tags
      cnt = cnt.replace(/#[\d\w-]+/g, '')
    }

    if (this.options.stripLinks === 'full') {
      // Completely remove internal links
      cnt = cnt.replace(/\[\[.+?\]\]/g, '') // Important: Non-greedy modifier needed to not strip out the whole text!
    } else if (this.options.stripLinks === 'unlink') {
      // Remove square brackets from internal links // ATTENTION BUG BUG BUG
      cnt = cnt.replace(/\[\[(.+?)\]\]/g, function (match, p1, offset, string) {
        return p1
      })
    }

    // Finally, save as temporary file.
    fs.writeFileSync(this.tempfile, cnt, 'utf8')
  }

  /**
   * On PDF export only, this function is called to prepare the LaTeX-template file
   */
  _buildLatexTpl () {
    this.textpl = path.join(this.options.dest, 'template.latex')
    let pdf = this.options.pdf // Retrieve the PDF options
    let cnt = fs.readFileSync(path.join(__dirname, './assets/export.tex'), 'utf8')
    // Do updates to the template
    // General options
    cnt = cnt.replace('%PAGE_NUMBERING%', pdf.pagenumbering)

    // Page setup
    cnt = cnt.replace('%PAPER_TYPE%', pdf.papertype)
    cnt = cnt.replace('%TOP_MARGIN%', pdf.tmargin + pdf.margin_unit)
    cnt = cnt.replace('%RIGHT_MARGIN%', pdf.rmargin + pdf.margin_unit)
    cnt = cnt.replace('%BOTTOM_MARGIN%', pdf.bmargin + pdf.margin_unit)
    cnt = cnt.replace('%LEFT_MARGIN%', pdf.lmargin + pdf.margin_unit)

    // Font setup
    cnt = cnt.replace('%MAIN_FONT%', pdf.mainfont)
    cnt = cnt.replace('%LINE_SPACING%', pdf.lineheight)
    cnt = cnt.replace('%FONT_SIZE%', pdf.fontsize + 'pt')

    // Metadata
    cnt = cnt.replace(/%PDF_TITLE%/g, this.options.title)
    cnt = cnt.replace('%PDF_SUBJECT%', this.options.title)
    cnt = cnt.replace(/%PDF_AUTHOR%/g, this.options.author)
    cnt = cnt.replace(/%PDF_KEYWORDS%/g, this.options.keywords)

    if (this.options.pdf.titlepage) {
      cnt = cnt.replace('%TITLEPAGE%', '\\maketitle\n\\pagebreak\n')
    } else {
      cnt = cnt.replace('%TITLEPAGE%', '')
    }

    if (this.options.pdf.toc) {
      // Also generate a table of contents
      cnt = cnt.replace('%GENERATE_TOC%', '\\setcounter{tocdepth}{' + this.options.pdf.tocDepth + '}\n\\tableofcontents\n\\pagebreak\n')
    } else {
      cnt = cnt.replace('%GENERATE_TOC%', '')
    }

    fs.writeFileSync(this.textpl, cnt, 'utf8')
  }

  /**
   * This function prepares HTML export of markdown files using showdown.
   */
  _prepareHTML () {
    // Create a new showdown converter w/ footnotes support
    this.showdown = new showdown.Converter({
      'tables': true,
      'requireSpaceBeforeHeadingText': true // Needed to not render tags at line beginning
    })
    this.showdown.setFlavor('github')
  }

  /**
   * Prepares the export via pandoc using a reference document (e.g., odt or docx)
   */
  _prepareWordProcessor () {
    // -s is the standalone flag
    this.tpl = '--reference-doc="' + path.join(this.options.tplDir, 'template.' + this.options.format) + '" -s'
    this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} -t ${this.options.format} -o "${this.targetFile}"`
  }

  /**
   * This prepares all file exports except HTML, PDF, DOCX, and ODT.
   */
  _prepareStandardExport () {
    // First override the tempfile in case the markdown input format differs
    // from the file format (e.g. revealjs results in an HTML file).
    let standalone = ''
    switch (this.options.format) {
      case 'revealjs':
        this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + '.revealjs.htm')
        break
      case 'rtf':
        standalone = '-s' // Must produce a standalone
        break
      case 'latex':
        // I don't like the .latex ending Pandoc uses.
        this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + '.tex')
        break
      case 'plain':
        this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + '.txt')
        break
    }

    this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} -t ${this.options.format} ${standalone} -o "${this.targetFile}"`
  }

  /**
   * This function prepares a PDF for export by setting the command.
   */
  _preparePDF () {
    this.tpl = `--template="${this.textpl}"`

    // It is necessary to tell Pandoc to generate a toc explicitly, b/c then
    // we don't need to grab the pre-rendered tex-file prior and chase it
    // through the xelatex engine manually and can let pandoc do the work.
    let toc = (this.options.pdf.toc) ? '--toc' : ''
    let tocdepth = (this.options.pdf.tocDepth) ? '--toc-depth=' + this.options.pdf.tocDepth : ''
    this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} ${toc} ${tocdepth} --pdf-engine=xelatex -o "${this.targetFile}"`
  }

  /**
   * This function realises the export and opens the file externally with the
   * respective viewer.
   */
  _make () {
    if (this.options.format === 'html' && this.showdown != null) {
      // Simply write the target file ourselves. Therefore first convert
      // to HTML and insert into the template, then replace the variables.
      let file = fs.readFileSync(this.tempfile, 'utf8')
      file = this.showdown.makeHtml(file)
      file = fs.readFileSync(path.join(__dirname, './assets/export.tpl'), 'utf8').replace('%BODY%', file)
      file = file.replace('%TITLE%', this.options.file.name)
      file = file.replace('%DATE%', formatDate(new Date()))
      // Replace footnotes. As HTML is only meant for preview & quick prints,
      // it doesn't matter how exact it is. Doesn't need to get to pandoc's
      // abilities.
      file = file.replace(/\[\^([\d\w]+)\]: (.+)\n/g, function (match, p1, p2, offset, string) {
        return `<p><small><sup><a name="fn-${p1}" ></a><a href="#fnref-${p1}">${p1}</a></sup> ${p2}</small></p>`
      })
      file = file.replace(/\[\^([\d\w]+)\]/g, function (match, p1, offset, string) {
        return `<sup><a name="fnref-${p1}"></a><a href="#fn-${p1}">${p1}</a></sup>`
      })

      fs.writeFile(this.targetFile, file, 'utf8', (err) => {
        this._cleanup() // Has to be done even on error
        if (err) {
          return this._abort(err)
        }

        this._finish()
      })
      return
    }

    if (!this.command || this.command.length === 0) {
      // No command given -> abort
      throw new ExportError('Exporting command was empty')
    }

    exec(this.command, { 'cwd': this.options.dest }, (error, stdout, stderr) => {
      this._cleanup() // Has to be done even on error
      if (error) {
        return this._abort(error)
      }

      this._finish()
    })
  }

  /**
   * Abort by showing an error prompt
   * @param  {String} [error=''] The error, if given
   */
  _abort (error = '') {
    throw new ExportError(trans('system.error.export_error_message', error), trans('system.error.export_error_title'))
  }

  /**
   * Cleanup operations (such as removing the temporary files)
   */
  _cleanup () {
    // remove the temporary file and then open it externally. Also, show
    // a notification that the export is complete.
    fs.unlink(this.tempfile, (err) => {
      if (err) {
        throw new ExportError(trans('system.error.export_temp_file', this.tempfile))
      }
    })

    // Remove LaTeX template file if given
    if (this.options.format === 'pdf') {
      fs.unlink(this.textpl, (err) => {
        if (err) {
          throw new ExportError(trans('system.error.export_temp_file', this.textpl))
        }
      })
    }
  }

  /**
   * Finish the export: Open the resulting file and notify of successful export.
   */
  _finish () {
    if (this.options.format === 'revealjs') {
      // We have to integrate the output of Pandoc into the template and
      // overwrite the destination file.
      let tpl = fs.readFileSync(path.join(__dirname, './assets/template.revealjs.htm'), 'utf8')
      tpl = tpl.replace('$title$', this.options.file.name)
      tpl = tpl.replace('$body$', fs.readFileSync(this.targetFile, 'utf8'))
      tpl = tpl.replace('$style$', fs.readFileSync(path.join(__dirname, './assets/revealjs-styles', this.options.revealJSStyle + '.css'), 'utf8'))
      fs.writeFileSync(this.targetFile, tpl, 'utf8')
    }

    require('electron').shell.openItem(this.targetFile)
  }
}

function makeExport (options) {
  return new ZettlrExport(options)
}

module.exports = makeExport
