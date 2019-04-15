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
const { formatDate, isFile } = require('../common/zettlr-helpers.js')
const { exec } = require('child_process')
const commandExists = require('command-exists').sync // Need to use here because we cannot rely on the config's availability
const path = require('path')
const fs = require('fs')
const showdown = require('showdown')
const ZIP = require('adm-zip')
const rimraf = require('rimraf')

/**
 * ZettlrExport is a stateless class that gets invoked via the constructor.
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
  constructor (options, callback = null) {
    // First: Initialise the engine
    // Make the variables available to all functions
    this.options = options
    this.tpl = ''
    this.command = ''
    this.showdown = null
    this._callback = callback // If given, will be called after export
    // We already know where the file will end up (on some exports this will
    // be overwritten by the prepare-command).
    this.targetFile = path.join(this.options.dest, path.basename(this.options.file.path, path.extname(this.options.file.path)) + '.' + this.options.format)
    // Intermediary file containing all content replacements et al.
    this.tempfile = path.join(this.options.dest, 'export.tmp')
    // If we have PDF export, we need a template file
    this.textpl = ''

    // Prevent errors if the PDF formats are not given (b/c one only wants to
    // export to non-pdf formats)
    if (!this.options.hasOwnProperty('pdf')) this.options.pdf = {}

    // Second make sure pandoc is installed. Without, only HTML is possible
    // through showdown.
    if (!commandExists('pandoc') && this.options.format !== 'html') {
      throw new Error(trans('system.error.no_pandoc_message'), trans('system.error.no_pandoc_title'))
    }

    // No matter what, for pdf we always need pandoc + latex installed.
    if ((this.options.format === 'pdf') && !commandExists('xelatex')) {
      throw new Error(trans('system.error.no_xelatex_message'), trans('system.error.no_xelatex_title'))
    }

    // Necessary evaluations
    if (!this.options.pdf.hasOwnProperty('toc')) this.options.pdf.toc = false
    if (!this.options.pdf.hasOwnProperty('tocDepth')) this.options.pdf.tocDepth = 0
    if (!this.options.pdf.hasOwnProperty('titlepage')) this.options.pdf.titlepage = false

    // Check the citeproc availability
    this._citeprocOptions = ''
    if (isFile(global.config.get('export.cslLibrary'))) {
      this._citeprocOptions += `--filter pandoc-citeproc --bibliography "${global.config.get('export.cslLibrary')}"`
    }

    if (this.options.hasOwnProperty('cslStyle') && isFile(this.options.cslStyle)) {
      this._citeprocOptions += ` --csl "${this.options.cslStyle}"`
    }

    //  Third prepare the export (e.g., strip IDs, tags or other unnecessary stuff)
    this._prepareFile()

    if (this.options.format === 'pdf') this._buildLatexTpl()

    // Fourth defer to the respective functions.
    switch (this.options.format) {
      case 'textbundle':
      case 'textpack':
        return this._makeBundle() // Special exporter
      case 'html':
        if (commandExists('pandoc')) {
          this._prepareStandardExport()
        } else {
          this._prepareHTML()
        }
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
      case 'docx':
      case 'odt':
        this._prepareStandardExport()
        break
      default:
        throw new Error('Unknown format: ' + this.options.format)
    }

    this._make()
  }

  /**
   * Returns the target file after the export has succeeded.
   * @return {String} The exported file path.
   */
  getFile () { return this.targetFile }

  _makeBundle () {
    /*
     * We have to do the following (in order):
     * 1. Find all images in the Markdown file.
     * 2. Replace all Markdown images with the URL assets/<filename>.<ext>
     * 3. Create a textbundle folder with the Markdown filename
     * 4. Move that file into the bundle
     * 5. Create the assets subfolder
     * 6. Move all images into the assets subfolder.
     * 7. In case of a textpack, zip it and remove the original bundle.
     * 8. Don't open the file, but merely the containing folder.
     */

    // First of all we must make sure that the generated file is actually a
    // textbundle, and not a textpack.
    if (this.options.format === 'textpack') {
      this.targetFile = this.targetFile.replace('.textpack', '.textbundle')
    }

    // Load in the tempfile
    let cnt = fs.readFileSync(this.tempfile, 'utf8')
    let imgRE = /!\[.*?\]\(([^)]+)\)/g
    let match
    let images = []

    while ((match = imgRE.exec(cnt)) !== null) {
      // We only care about images that are currently present on the filesystem.
      if (isFile(match[1])) {
        images.push({
          'old': match[1],
          'new': path.join('assets', path.basename(match[1]))
        })
      }
    }

    // Now replace all image filenames with the new ones
    for (let image of images) {
      cnt = cnt.replace(image.old, image.new)
    }

    // Create the textbundle folder
    try {
      fs.lstatSync(this.targetFile)
    } catch (e) {
      fs.mkdirSync(this.targetFile)
    }

    // Write the markdown file
    fs.writeFileSync(path.join(this.targetFile, 'text.md'), cnt, 'utf8')

    // Create the assets folder
    try {
      fs.lstatSync(path.join(this.targetFile, 'assets'))
    } catch (e) {
      fs.mkdirSync(path.join(this.targetFile, 'assets'))
    }

    // Copy over all images
    for (let image of images) {
      fs.copyFileSync(image.old, path.join(this.targetFile, image.new))
    }

    // Finally, create the info.json
    fs.writeFileSync(path.join(this.targetFile, 'info.json'), JSON.stringify({
      'version': 2,
      'type': 'net.daringfireball.markdown',
      'creatorIdentifier': 'com.zettlr.app',
      'sourceURL': this.options.file.path
    }), 'utf8')

    // As a last step, check whether or not we should actually create a textpack
    if (this.options.format === 'textpack') {
      // Zip dat shit!
      let archive = new ZIP()
      let zipName = this.targetFile.replace('.textbundle', '.textpack')
      // From the docs: If you want to create a directory the entryName must end
      // in / and a null buffer should be provided.
      let root = path.basename(this.targetFile)
      if (root.charAt(root.length - 1) !== '/') root += '/'
      archive.addFile(root, Buffer.alloc(0))
      archive.addLocalFolder(this.targetFile, path.basename(this.targetFile))
      archive.writeZip(zipName)
      // Afterwards remove the source file
      rimraf(this.targetFile, () => { /* Nothing to do */ })
    }

    // Afterwards, open the containing directory
    require('electron').shell.showItemInFolder(this.targetFile)
  }

  /**
   * Perform necessary steps on the file such as replacing IDs or tags, if
   * wanted.
   */
  _prepareFile () {
    // First load the file.
    let cnt = this.options.file.read({ 'absoluteImagePaths': true })

    // Second strip tags if necessary
    if (this.options.stripTags) {
      // Strip all tags
      cnt = cnt.replace(/(?<= |\n|^)#(#?[A-Z0-9-_]+#?)/gi, '') // cnt.replace(/#[\d\w-]+/g, '')
    }

    // Second remove or unlink links.
    let ls = global.config.get('zkn.linkStart').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    let le = global.config.get('zkn.linkEnd').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    if (this.options.stripLinks === 'full') {
      cnt = cnt.replace(new RegExp(ls + '.+?' + le, 'g'), '') // Important: Non-greedy modifier needed to not strip out the whole text!
    } else if (this.options.stripLinks === 'unlink') {
      // Only remove the link identifiers, not the content (note the capturing
      // group that's missing from above's replacement)
      cnt = cnt.replace(new RegExp(ls + '(.+?)' + le, 'g'), function (match, p1, offset, string) {
        return p1
      })
    }

    // Third check if we should strip the IDs. We have to do IDs afterwards because
    // of the "at least 1"-modifier (+) in the link-unlink-regexes.
    if (this.options.stripIDs) {
      // Strip all ZKN-IDs in the pattern given by the user
      cnt = cnt.replace(new RegExp(global.config.get('zkn.idRE'), 'g'), '')
    }

    // Finally, save as temporary file.
    fs.writeFileSync(this.tempfile, cnt, 'utf8')
  }

  /**
   * On PDF export only, this function is called to prepare the LaTeX-template file
   */
  _buildLatexTpl () {
    this.textpl = path.join(this.options.dest, 'template.latex')
    let file = path.join(__dirname, './assets/export.tex')
    let pdf = this.options.pdf // Retrieve the PDF options

    // If a textpl is given, read this instead of the builtin template
    if (pdf.hasOwnProperty('textpl') && isFile(pdf.textpl)) {
      file = pdf.textpl
    }
    let cnt = fs.readFileSync(file, 'utf8')
    // Do updates to the template
    // General options
    let variables = {
      // Page setup
      'PAGE_NUMBERING': pdf.pagenumbering,
      'PAPER_TYPE': pdf.papertype,
      'TOP_MARGIN': pdf.tmargin + pdf.margin_unit,
      'RIGHT_MARGIN': pdf.rmargin + pdf.margin_unit,
      'BOTTOM_MARGIN': pdf.bmargin + pdf.margin_unit,
      'LEFT_MARGIN': pdf.lmargin + pdf.margin_unit,
      // Font setup
      'MAIN_FONT': pdf.mainfont,
      'SANS_FONT': pdf.sansfont,
      'LINE_SPACING': pdf.lineheight,
      'FONT_SIZE': pdf.fontsize + 'pt',
      // Metadata
      'PDF_TITLE': this.options.title,
      'PDF_SUBJECT': this.options.title,
      'PDF_AUTHOR': this.options.author,
      'PDF_KEYWORDS': this.options.keywords,
      // Project settings
      'TITLEPAGE': (pdf.titlepage) ? '\\maketitle\n\\pagebreak\n' : '',
      'GENERATE_TOC': (pdf.toc) ? `\\setcounter{tocdepth}{${pdf.tocDepth}}\n\\tableofcontents\n\\pagebreak\n` : ''
    }

    for (let key in variables) {
      cnt = cnt.replace(new RegExp('\\$' + key + '\\$', 'g'), variables[key])
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
      case 'html':
      case 'odt':
      case 'docx':
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
    this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} ${this._citeprocOptions} -t ${this.options.format} ${standalone} -o "${this.targetFile}"`
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
    this.command = `pandoc "${this.tempfile}" -f markdown ${this.tpl} ${toc} ${tocdepth} ${this._citeprocOptions} --pdf-engine=xelatex -o "${this.targetFile}"`
  }

  /**
   * This function realises the export and opens the file externally with the
   * respective viewer.
   */
  _make () {
    // If pandoc is available, Export won't have prepared showdown, so showdown
    // will be null, meaning Export will call pandoc regularly.
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
      throw new Error('Exporting command was empty')
    }

    exec(this.command, { 'cwd': this.options.dest }, (error, stdout, stderr) => {
      this._cleanup() // Has to be done even on error
      if (error) {
        return this._abort(error, stderr)
      }

      this._finish()
    })
  }

  /**
   * Abort the operation and optionally show an error dialog
   * @param  {Error} error  The error object
   * @param  {String} [stdout=''] Additional console information
   * @return {void}        Only throws.
   */
  _abort (error, stdout = '') {
    // Shorten the error message to a manageable format, b/c exec() tends to
    // append the whole stderr to the message
    if (/\n/.test(error.message)) error.message = error.message.split('\n')[0]

    if (this._callback) {
      this._callback({
        title: trans('system.error.export_error_title'),
        message: error.message,
        additionalInfo: stdout
      })
    } else {
      throw new Error(trans('system.error.export_error_message', error.message), trans('system.error.export_error_title'))
    }
  }

  /**
   * Cleanup operations (such as removing the temporary files)
   */
  _cleanup () {
    // remove the temporary file and then open it externally. Also, show
    // a notification that the export is complete.
    fs.unlink(this.tempfile, (err) => {
      if (err) {
        this._abort(new Error(trans('system.error.export_temp_file', this.tempfile)))
      }
    })

    // Remove LaTeX template file if given
    if (this.options.format === 'pdf') {
      fs.unlink(this.textpl, (err) => {
        if (err) {
          this._abort(new Error(trans('system.error.export_temp_file', this.textpl)))
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

    // The user may pass an optional autoOpen property. If not present or set to
    // true, the file will be opened automatically. If present and set to false,
    // it'll do nothing.
    if (!this.options.hasOwnProperty('autoOpen') || this.options.autoOpen) {
      require('electron').shell.openItem(this.targetFile)
    }

    // After everything is done, call the callback
    this._callback(null) // null means no error
  }
}

/**
 * Returns a Promise that resolves or rejects depending on the outcome of the export.
 * @param  {Object} options An options object compatible to ZettlrExport.
 * @return {Promise}         A promise
 */
function makeExport (options) {
  return new Promise((resolve, reject) => {
    try {
      let e = new ZettlrExport(options, (err, stdout = '') => {
        if (err) reject(err)
        resolve(e)
      })
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = makeExport
