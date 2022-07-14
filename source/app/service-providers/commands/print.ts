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
import { makeExport } from './exporter'
import { ExporterOptions } from './exporter/types'
import { EXT2READER } from '@common/util/pandoc-maps'
import getPlainPandocReaderWriter from '@common/util/plain-pandoc-reader-writer'

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
    let filePath = this._app.documents.activeFile?.path
    if (arg !== undefined) {
      filePath = arg
    }

    if (filePath == null) {
      this._app.log.error('[Print] Cannot print document: Not found.')
      return
    }

    const fileDescriptor = this._app.fsal.findFile(filePath)

    if (fileDescriptor === null) {
      this._app.log.error('[Print] Cannot print document: Not found.')
      return
    }

    const extWithoutDot = fileDescriptor.ext.substring(1)

    if (!(extWithoutDot in EXT2READER)) {
      this._app.log.error(`[Print] Cannot print document: File extension "${extWithoutDot}" not recognized.`)
      return
    }

    // Retrieve all profiles ...
    const profiles = (await this._app.assets.listDefaults())
      // ... sans invalid ones ...
      .filter(profile => !profile.isInvalid)
      // ... or those that do not have an HTML writer ...
      .filter(profile => getPlainPandocReaderWriter(profile.writer) === 'html')
      // ... and those that feature incompatible readers.
      .filter(profile => EXT2READER[extWithoutDot].includes(getPlainPandocReaderWriter(profile.reader)))

    const opt: ExporterOptions = {
      profile: profiles[0], // First valid filtered profile will be used
      sourceFiles: [fileDescriptor], // The file to be exported
      targetDirectory: app.getPath('temp'), // Export to temporary directory
      absoluteImagePaths: true, // Explicitly request absolute image paths
      cwd: fileDescriptor.dir
    }

    // Call the exporter.
    try {
      this._app.log.verbose('[Printer] Exporting file to HTML ...')
      const output = await makeExport(opt, this._app.log, this._app.config, this._app.assets)
      if (output.code !== 0) {
        throw new Error(`Export failed with code ${output.code}`)
      }
      // Now we'll need to open the print window.
      this._app.windows.showPrintWindow(output.targetFile)
    } catch (err: any) {
      this._app.log.error(`[Print] Could not export document: ${err.message as string}`, err)
      this._app.notifications.show(`${err.name as string}: ${err.message as string}`)
    }
  }
}
