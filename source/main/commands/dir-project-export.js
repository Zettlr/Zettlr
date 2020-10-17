/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirProjectExport command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command exports a directory as project.
 *
 * END HEADER
 */

const path = require('path')
const sanitize = require('sanitize-filename')
const ZettlrCommand = require('./zettlr-command')
const makeExport = require('../modules/export')
const objectToArray = require('../../common/util/object-to-array')
const makeImgPathsAbsolute = require('../../common/util/make-img-paths-absolute')

// Extracts footnotes
const fnRE = /\[\^([\w]+?)\]/gm

class DirProjectExport extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-project-export')
  }

  /**
    * Exports the current project.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt, arg) {
    // First get the directory
    let dir = this._app.findDir(arg.hash)

    if (dir === null) {
      global.log.error('Could not export project: Directory not found.')
      return false
    }

    let config = dir._settings.project

    if (config === null) {
      global.log.error(`Could not export project: Directory ${dir.name} has no project.`)
      return false
    }

    // Receive a two dimensional array of all directory contents
    let files = objectToArray(dir, 'children')

    // Reduce to files-only
    files = files.filter((elem) => { return elem.type === 'file' })

    // Concat the files
    let contents = []
    for (let file of files) {
      let fileContents = await this._app.getFileSystem().getFileContents(file)
      fileContents = fileContents.content
      // Directly make all image paths absolute to prevent errors if used
      // in nested project directories (in which this._dir.path is not the
      // same for all files). Also make the footnotes unique to prevent
      // assigning errors.
      fileContents = makeImgPathsAbsolute(file.dir, fileContents)
      fileContents = fileContents.replace(fnRE, (match, p1, offset, string) => `[^${String(file.hash)}${p1}]`)
      contents.push(fileContents)
    }
    contents = contents.join('\n\n')

    // Mock a file object to which ZettlrExport has access
    let tempfile = {
      'path': path.join(dir.path, sanitize(config.title, { replacement: '-' })),
      'name': sanitize(config.title, { replacement: '-' }), // obvious filename
      'content': contents
    }

    // Start up the Exporter
    let opt = {
      'format': config.format, // Which format: "html", "docx", "odt", "pdf"
      'file': tempfile, // The file to be exported
      'dest': dir.path, // On project exports, always dir path
      'stripIDs': true,
      'stripTags': true,
      'stripLinks': 'full',
      'pdf': config.pdf,
      'title': config.title,
      'date': '\\today',
      'author': config.pdf.author,
      'keywords': config.pdf.keywords,
      'cslStyle': config.cslStyle
    }

    // Aaaand export.
    makeExport(opt)
      .then((targetFile) => { /* Nothing to do */ })
      .catch((err) => {
        global.log.error(err.message, err)
        global.ipc.notifyError(err)
      })
  }
}

module.exports = DirProjectExport
