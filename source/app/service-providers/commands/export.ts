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
import type { ExporterOptions } from './exporter/types'
import { promises as fs } from 'fs'
import path from 'path'
import { PANDOC_WRITERS } from '@common/pandoc-util/pandoc-maps'
import { type PandocProfileMetadata } from '@providers/assets'
import { runShellCommand } from './exporter/run-shell-command'
import { showNativeNotification } from '@common/util/show-notification'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class Export extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, [ 'export', 'custom-export' ])
  }

  /**
    * Exports a single file to another format.
    *
    * @param  {string} evt The event name
    * @param  {Object} arg An object containing hash and wanted extension.
    * @return {Boolean}     Whether or not the call succeeded.
    */
  async run (evt: string, arg: any): Promise<void> {
    // Custom export
    if (evt === 'custom-export') {
      const { displayName, file } = arg as { displayName: string, file: string }
      const commands = this._app.config.get().export.customCommands
      const foundCommand = commands.find(c => c.displayName === displayName)
      if (foundCommand === undefined) {
        throw new Error(`Cannot run custom command ${displayName}: Not found`)
      }

      this._app.log.info(`[Export] Running custom export command ${displayName} on file ${file} ...`)
      const cwd = path.dirname(file)
      const output = await runShellCommand(foundCommand.command, [`"${file}"`], cwd)

      if (output.code !== 0) {
        this._app.log.error(`[Export] Custom export ${displayName} failed with code ${output.code}`, output.stderr)
        const title = trans('Export failed')
        const message = trans('An error occurred during export: %s', `Custom Command exited with code ${output.code}`)
        this._app.windows.showErrorMessage(title, message, output.stderr)
      } else {
        this._app.log.info(`[Export] File ${path.basename(file)} exported successfully.`)
      }

      if (output.stdout.length > 0) {
        this._app.log.info('This custom export run produced additional output.', output.stdout)
      }
      return // Done
    }

    // Regular export
    const { file, profile, exportTo } = arg as { file: string, profile: PandocProfileMetadata, exportTo: string }

    const exporterOptions: ExporterOptions = {
      profile,
      targetDirectory: '',
      sourceFiles: [],
      cwd: undefined
    }

    // If the file is modified, then the document manager will have a more
    // recent version of the file in its cache. In that case, we'll silently
    // overwrite the source file with a temporary one that we create with the
    // contents of said modified file.
    const isModified = this._app.documents.isModified(file)
    const filename = path.basename(file)
    const tempPath = path.join(app.getPath('temp'), filename)
    if (isModified) {
      const cachedVersion = await this._app.documents.getDocument(file)
      await fs.writeFile(tempPath, cachedVersion.content, { encoding: 'utf8' })
    }

    // We must have an absolute path given in file
    const fileDescriptor = this._app.workspaces.findFile(file)
    if (fileDescriptor !== undefined) {
      // If we have a cached version, we already have a file to export.
      // Otherwise, use the regular one from disk.
      if (isModified) {
        exporterOptions.sourceFiles.push({ path: tempPath, name: filename, ext: path.extname(filename) })
      } else {
        exporterOptions.sourceFiles.push(fileDescriptor)
      }

      // The cwd, however, is the source file one's
      exporterOptions.cwd = fileDescriptor.dir

      // A user can override this default by providing in a frontmatter the
      // key zettlr.pandoc_working_dir: /path/to/directory
      if (fileDescriptor.type === 'file' &&
      typeof fileDescriptor.frontmatter?.zettlr?.pandoc_working_dir === 'string' &&
      await this._app.fsal.isDir(fileDescriptor.frontmatter.zettlr.pandoc_working_dir)) {
        exporterOptions.cwd = fileDescriptor.frontmatter.zettlr.pandoc_working_dir
      }

      switch (exportTo) {
        case 'ask': {
          const folderSelection = await this._app.windows.askDir(trans('Choose export destination'), null, trans('Save'))
          if (folderSelection === undefined || folderSelection.length === 0) {
            this._app.log.error('[Export] Could not run exporter: Folderselection did not have a result!')
            return
          }
          exporterOptions.targetDirectory = folderSelection[0]
          break
        }
        case 'temp':
          exporterOptions.targetDirectory = app.getPath('temp')
          break
        case 'cwd':
        default:
          exporterOptions.targetDirectory = fileDescriptor.dir
          break
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
        showNativeNotification(trans('Exporting to %s', readableFormat))

        // In case of a textbundle/pack it's a folder, else it's a file
        if (this._app.config.get().export.autoOpenExportedFiles) {
          if ([ 'textbundle', 'textpack' ].includes(arg.profile.writer)) {
            shell.showItemInFolder(output.targetFile)
          } else {
            const potentialError = await shell.openPath(output.targetFile)
            if (potentialError !== '') {
              throw new Error('Could not open exported file: ' + potentialError)
            }
          }
        }
      } else {
        const title = trans('Export failed')
        const message = trans('An error occurred on export: %s', `Pandoc exited with code ${output.code}`)
        const contents = output.stderr.join('\n')
        this._app.windows.showErrorMessage(title, message, contents)
      }
    } catch (err: any) {
      this._app.windows.showErrorMessage(err.message, err.message)
      this._app.log.error(err.message, err)
    }
  }
}
