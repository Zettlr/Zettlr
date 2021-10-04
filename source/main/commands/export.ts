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
import { app, shell } from 'electron'
import { makeExport, getAvailableFormats } from '../modules/export'
import { trans } from '../../common/i18n-main'
import { ExporterOptions } from '../modules/export/types'

export default class Export extends ZettlrCommand {
  constructor (app: any) {
    super(app, [ 'export', 'get-available-export-formats' ])
  }

  /**
    * Export a file to another format.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash and wanted extension.
    * @return {Boolean}     Whether or not the call succeeded.
    */
  async run (evt: string, arg: any): Promise<void> {
    if (evt === 'get-available-export-formats') {
      // In this case only enumerate the available export formats
      return getAvailableFormats()
    }

    const { file, format, options, exportTo } = arg

    const fileDescriptor = this._app.getFileSystem().findFile(file)
    if (fileDescriptor === null) {
      global.notify.normal(trans('system.error.fnf_message'))
      return
    }

    // Determine the target directory
    let dest = (exportTo === 'temp') ? app.getPath('temp') : fileDescriptor.dir

    const exporterOptions: ExporterOptions = {
      format: format,
      targetDirectory: dest,
      sourceFiles: [fileDescriptor],
      cwd: fileDescriptor.dir
    }

    // Call the exporter. Don't throw the "big" error as this is single-file export
    try {
      const output = await makeExport(exporterOptions, options)
      if (output.code === 0) {
        global.log.info(`Successfully exported file to ${output.targetFile}`)
        global.notify.normal(trans('system.export_success', format.toUpperCase()))

        // In case of a textbundle/pack it's a folder, else it's a file
        if ([ 'textbundle', 'textpack' ].includes(arg.format)) {
          shell.showItemInFolder(output.targetFile)
        } else {
          const potentialError = await shell.openPath(output.targetFile)
          if (potentialError !== '') {
            throw new Error('Could not open exported file: ' + potentialError)
          }
        }
      } else {
        const title = trans('system.error.export_error_title')
        const message = trans('system.error.export_error_message', output.stderr[0])
        const contents = output.stderr.join('\n')
        global.application.displayErrorMessage(title, message, contents)
      }
    } catch (err: any) {
      global.application.displayErrorMessage(err.message, err.message)
      global.log.error(err.message, err)
    }
  }
}
