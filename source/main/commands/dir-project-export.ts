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

import path from 'path'
import sanitize from 'sanitize-filename'
import ZettlrCommand from './zettlr-command'
import makeExport from '../modules/export'
import objectToArray from '../../common/util/object-to-array'
import makeImgPathsAbsolute from '../../common/util/make-img-paths-absolute'

import { getFnExportRE } from '../../common/regular-expressions'

export default class DirProjectExport extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-project-export')
  }

  /**
    * Exports the current project.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    // First get the directory
    let dir = this._app.findDir(arg.hash)

    if (dir === null) {
      global.log.error('Could not export project: Directory not found.')
      return false
    }

    let config = dir._settings.project

    if (config === null) {
      global.log.error(`Could not export project: Directory ${dir.name as string} has no project.`)
      return false
    }

    // Receive a two dimensional array of all directory contents
    let files = objectToArray(dir, 'children')

    // Reduce to files-only
    files = files.filter((elem) => { return elem.type === 'file' })

    // Import our RE
    let fnExportRE = getFnExportRE(true) // We want the multiline version.

    // Concat the files
    let contents: string[] = []
    for (let file of files) {
      const fileDescriptor = await this._app.getFileSystem().getFileContents(file)
      let fileContents: string = fileDescriptor.content
      // Directly make all image paths absolute to prevent errors if used
      // in nested project directories (in which this._dir.path is not the
      // same for all files). Also make the footnotes unique to prevent
      // assigning errors.
      fileContents = makeImgPathsAbsolute(file.dir, fileContents)

      fileContents = fileContents.replace(fnExportRE, (match, p1: string, offset, string) => `[^${String(file.hash)}${p1}]`)

      contents.push(fileContents)
    }
    const finalContents = contents.join('\n\n')

    // Mock a file object to which ZettlrExport has access
    let tempfile = {
      'path': path.join(dir.path, sanitize(config.title, { replacement: '-' })),
      'name': sanitize(config.title, { replacement: '-' }), // obvious filename
      'content': finalContents
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
    try {
      await makeExport(opt)
    } catch (err) {
      global.log.error(err.message, err)
      global.notify.error({
        title: err.title || err.message,
        message: err.message,
        additionalInfo: err.additionalInfo || ''
      }, true)
    }

    return true
  }
}
