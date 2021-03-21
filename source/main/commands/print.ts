/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Print command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command shows the print window.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { app } from 'electron'
import makeExport from '../modules/export'
import { ExporterOptions } from '../modules/export/types'
import { MDFileMeta } from '../modules/fsal/types'

export default class Print extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'print')
  }

  /**
   * Prints the current file (in: opening the print window)
   * @param {String} evt The event name
   * @param {Object} arg The argument
   * @return {Boolean} Whether the command ran successful
   */
  async run (evt: string, arg?: string): Promise<void> {
    let filePath = this._app.getFileSystem().activeFile
    if (arg !== undefined) {
      filePath = arg
    }

    if (filePath == null) {
      global.log.error('[Print] Cannot print document: Not found.')
      return
    }

    // First we need to export the current file as HTML.
    let file: MDFileMeta = await this._app.runCommand('get-file-contents', filePath)
    if (file === null) {
      return // No file open.
    }

    let opt: ExporterOptions = {
      'format': 'html',
      'file': file, // The file to be exported
      'dest': app.getPath('temp'), // Export to temporary directory
      // 'title': file.name.substr(0, file.name.lastIndexOf('.')),
      'autoOpen': false, // Do not automatically open the file after export
      'absoluteImagePaths': true // Explicitly request absolute image paths
    }

    // Call the exporter.
    try {
      const target = await makeExport(opt)
      // Now we'll need to open the print window.
      this._app.showPrintWindow(target.targetFile)
    } catch (err) {
      global.log.error(`[Print] Could not export document: ${err.message as string}`, err)
      global.notify.normal(`${err.name as string}: ${err.message as string}`)
    }
  }
}
