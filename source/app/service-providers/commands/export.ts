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
import { makeExport } from './exporter'
import { trans } from '@common/i18n-main'
import { ExporterOptions } from './exporter/types'
import { promises as fs } from 'fs'
import path from 'path'
import isDir from '@common/util/is-dir'
import { PANDOC_WRITERS } from '@common/util/pandoc-maps'
import { PandocProfileMetadata } from '@dts/common/assets'

export default class Export extends ZettlrCommand {
  constructor (app: any) {
    super(app, ['export'])
  }

  /**
    * Export a file to another format.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash and wanted extension.
    * @return {Boolean}     Whether or not the call succeeded.
    */
  async run (evt: string, arg: any): Promise<void> {
    const { file, content, profile, exportTo } = arg as { file: string, content: string, profile: PandocProfileMetadata, exportTo: string }

    const exporterOptions: ExporterOptions = {
      profile: profile,
      targetDirectory: '',
      sourceFiles: [],
      cwd: undefined
    }

    if (content !== undefined && typeof content === 'string') {
      // We should export some raw content. So targetDirectory must be temp. We
      // use a default filename so the caller can get away with only specifying
      // content and format. However, they can also specify an absolute filepath
      // which we can use to fill in more info about the export
      exporterOptions.targetDirectory = app.getPath('temp')
      let filename = `zettlr_export_${Date.now()}.md`
      if (file !== undefined && typeof file === 'string') {
        filename = path.basename(file)
        if (isDir(path.dirname(file))) {
          exporterOptions.cwd = path.dirname(file)
        }
      }
      // Write the content to file
      const tempPath = path.join(app.getPath('temp'), filename)
      await fs.writeFile(tempPath, content, { encoding: 'utf8' })
      exporterOptions.sourceFiles.push({
        path: tempPath,
        name: filename,
        ext: path.extname(filename)
      })
    } else {
      // We must have an absolute path given in file
      const fileDescriptor = this._app.fsal.findFile(file)
      if (fileDescriptor !== null) {
        exporterOptions.sourceFiles.push(fileDescriptor)
        exporterOptions.cwd = fileDescriptor.dir
        switch (exportTo) {
          case 'ask': {
            const folderSelection = await this._app.windows.askDir(trans('system.export_dialog.title'), null, trans('system.export_dialog.save'))
            if (folderSelection === undefined || folderSelection.length === 0) {
              this._app.log.error('[Export] Could not run exporter: Folderselection did not have a result!')
              return
            }
            exporterOptions.targetDirectory = folderSelection[0]
            break
          }
          case 'temp':
          case 'cwd':
          default:
            exporterOptions.targetDirectory = (exportTo === 'temp') ? app.getPath('temp') : fileDescriptor.dir
            break
        }
      }
    }

    // We should have at least one file present now
    if (exporterOptions.sourceFiles.length === 0) {
      this._app.log.error('[Export] Could not run exporter: No source files were given. Arguments provided:', arg)
      return
    }

    // Call the exporter. Don't throw the "big" error as this is single-file export
    try {
      this._app.log.verbose(`[Exporter] Exporting ${exporterOptions.sourceFiles.length} files to ${exporterOptions.targetDirectory}`)
      const output = await makeExport(exporterOptions, this._app.log, this._app.config, this._app.assets)
      if (output.code === 0) {
        this._app.log.info(`Successfully exported file to ${output.targetFile}`)
        const readableFormat = (profile.writer in PANDOC_WRITERS) ? PANDOC_WRITERS[profile.writer] : profile.writer
        this._app.notifications.show(trans('system.export_success', readableFormat))

        // In case of a textbundle/pack it's a folder, else it's a file
        if ([ 'textbundle', 'textpack' ].includes(arg.profile.writer)) {
          shell.showItemInFolder(output.targetFile)
        } else {
          const potentialError = await shell.openPath(output.targetFile)
          if (potentialError !== '') {
            throw new Error('Could not open exported file: ' + potentialError)
          }
        }
      } else {
        const title = trans('system.error.export_error_title')
        const message = trans('system.error.export_error_message', `Pandoc exited with code ${output.code}`)
        const contents = output.stderr.join('\n')
        this._app.windows.showErrorMessage(title, message, contents)
      }
    } catch (err: any) {
      this._app.windows.showErrorMessage(err.message, err.message)
      this._app.log.error(err.message, err)
    }
  }
}
