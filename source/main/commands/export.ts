/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Export command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command exports a single file.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { app } from 'electron'
import path from 'path'
import makeExport from '../modules/export'
import { trans } from '../../common/i18n'

export default class Export extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'export')
  }

  /**
    * Export a file to another format.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash and wanted extension.
    * @return {Boolean}     Whether or not the call succeeded.
    */
  async run (evt: string, arg: any): Promise<void> {
    const fileDescriptor = this._app.getFileSystem().findFile(arg.hash)
    if (fileDescriptor === null) {
      return global.notify.normal(trans('system.error.fnf_message'))
    }

    let fileMetadata = await this._app.getFileSystem().getFileContents(fileDescriptor)

    let dest
    if (global.config.get('export.dir') === 'temp') {
      // The user wants the file saved to the temporary directory.
      dest = app.getPath('temp')
    } else if (fileMetadata.parent !== null) {
      // The user wants the file saved in the file's directory, and it is not a
      // root file. As we call `getFile`, we do not get the actual pointer to
      // the object within the tree, but a metadata object, so we have to
      // retrieve the parent as well.
      const parent = global.application.findDir(fileMetadata.parent)
      dest = parent.path
    } else {
      // The user wants the file saved in the file's directory, and it is a root
      // file.
      dest = path.dirname(fileMetadata.path)
    }

    // Title precedence is: Filename, but if there is a frontmatter title, use
    // that one instead. And if there is a H1 and the corresponding option is
    // set, use that one as a fallback
    let title = fileMetadata.name.substr(0, fileMetadata.name.lastIndexOf('.'))
    if (fileDescriptor.type === 'file' && typeof fileDescriptor?.frontmatter?.title === 'string') {
      title = fileDescriptor.frontmatter.title
    } else if (fileDescriptor.type === 'file' && typeof fileDescriptor.firstHeading === 'string' && global.config.get('display.useFirstHeadings') === true) {
      title = fileDescriptor.firstHeading
    }

    // The PDF author can also be overridden by a frontmatter
    let author = global.config.get('pdf').author
    if (fileDescriptor.type === 'file' && typeof fileDescriptor?.frontmatter?.author === 'string') {
      let a = fileDescriptor.frontmatter.author
      if (typeof a === 'string') {
        author = a
      } else if (Array.isArray(a)) {
        author = a.map(e => {
          if (typeof e === 'string') return e
          if (e.hasOwnProperty('name')) return e.name
          return String(e) // No idea what the value was but now we can work with it
        })

        author = author.join(', ')
      }
    }

    let keywords = global.config.get('pdf').keywords
    // The same applies to keywords (only they get merged)
    if (fileDescriptor.type === 'file' && fileDescriptor.tags.length > 0) {
      if (keywords.length > 0) {
        keywords = keywords.split(/[,;]/gi).map((e: string) => e.trim())
        keywords = keywords.concat(fileDescriptor.tags).join(', ')
      } else {
        keywords = fileDescriptor.tags.join(', ')
      }
    }

    let date = '\\today'
    if (fileDescriptor.type === 'file' && typeof fileDescriptor?.frontmatter?.date === 'string') {
      date = fileDescriptor.frontmatter.date
    }

    let opt = {
      'format': arg.ext, // Which format: "html", "docx", "odt", "pdf"
      'file': fileMetadata, // The file to be exported
      'dest': dest,
      'stripIDs': global.config.get('export.stripIDs'),
      'stripTags': global.config.get('export.stripTags'),
      'stripLinks': global.config.get('export.stripLinks'),
      'pdf': global.config.get('pdf'),
      'title': title,
      'date': date,
      'author': author,
      'keywords': keywords,
      'cslStyle': global.config.get('export.cslStyle')
    }

    // Call the exporter. Don't throw the "big" error as this is single-file export
    try {
      const targetFile: string = await makeExport(opt)
      global.log.info(`Successfully exported file to ${targetFile}`)
      global.notify.normal(trans('system.export_success', opt.format.toUpperCase()), true)
    } catch (err) {
      global.log.error(err.message, err)
      // Error may be thrown. If there's additional info, spit out an extended
      // dialog.
      if (err.additionalInfo) {
        global.notify.error(err, true)
      } else {
        global.notify.normal(`${err.name as string}: ${err.message as string}`, true)
      }
    }
  }
}

module.exports = Export
