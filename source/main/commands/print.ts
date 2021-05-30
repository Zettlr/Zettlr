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
import { makeExport } from '../modules/export'
import { ExporterOptions } from '../modules/export/types'

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
    let filePath = this._app.getDocumentManager().activeFile?.path
    if (arg !== undefined) {
      filePath = arg
    }

    if (filePath == null) {
      global.log.error('[Print] Cannot print document: Not found.')
      return
    }

    const fileDescriptor = this._app.getFileSystem().findFile(filePath)

    if (fileDescriptor === null) {
      global.log.error('[Print] Cannot print document: Not found.')
      return
    }

    let opt: ExporterOptions = {
      format: 'html',
      sourceFiles: [fileDescriptor], // The file to be exported
      targetDirectory: app.getPath('temp'), // Export to temporary directory
      absoluteImagePaths: true // Explicitly request absolute image paths
    }

    // Call the exporter.
    try {
      const output = await makeExport(opt)
      // TODO: Check for errors!
      // Now we'll need to open the print window.
      this._app.showPrintWindow(output.targetFile)
    } catch (err) {
      global.log.error(`[Print] Could not export document: ${err.message as string}`, err)
      global.notify.normal(`${err.name as string}: ${err.message as string}`)
    }
  }
}
