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

import ZettlrCommand from './zettlr-command'
import { getCustomProfiles, makeExport } from './exporter'
import { shell, dialog } from 'electron'
import type { ExporterOptions } from './exporter/types'
import type LogProvider from '@providers/log'
import { trans } from '@common/i18n-main'
import { runShellCommand } from './exporter/run-shell-command'
import { showNativeNotification } from '@common/util/show-notification'
import path from 'path'
import type { AppServiceContainer } from 'source/app/app-service-container'
import { type PandocProfileMetadata } from '../assets'
import type { DirDescriptor, ProjectSettings } from 'source/types/common/fsal'

/**
 * Converts a path fragment to use Windows path separators by replacing / with \
 *
 * @param   {string}  pathFragment  The path fragment
 *
 * @return  {string}                The path fragment using Windows conventions.
 */
function pathToWin (pathFragment: string): string {
  return pathFragment.replace(/\//g, '\\')
}

export default class DirProjectExport extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-project-export')
  }

  /**
    * Exports the current project.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: string): Promise<boolean> {
    // First get the directory
    const dir = await this._app.fsal.getAnyDirectoryDescriptor(arg)

    if (dir === undefined) {
      this._app.log.error('Could not export project: Directory not found.')
      return false
    }

    const config = dir.settings.project

    if (config === null) {
      this._app.log.error(`Could not export project: Directory ${dir.name} is not a project.`)
      return false
    }

    // Now, we have to retrieve the files. We have a directory descriptor that
    // contains a list of existing files on disk, and we have a project config
    // that specifies files and a sorting for export. We need to check that all
    // files specified in the config still exist. If a file is missing, display
    // a warning but export anyway.
    const availableFiles = await this._app.fsal.readDirectoryRecursively(dir.path)

    // Since the config.files array already includes relative paths, we
    // basically just have to make them absolute relative to the directory and
    // ensure those paths exist in availableFiles.
    const existingFilesWithSorting = config.files
      // Since we default to always using Unix paths, to make the magic work on
      // Windows, we here have to map the relative paths in the project config
      // (back) to the Windows conventions by replacing / with \\.
      .map(file => process.platform === 'win32' ? pathToWin(file) : file)
      .map(file => path.join(dir.path, file))
      .filter(file => availableFiles.includes(file))

    if (existingFilesWithSorting.length === 0) {
      this._app.log.warning('[Project] Aborting project export: No files to export')
      dialog.showErrorBox(
        trans('Cannot export project'),
        trans('There are no files selected for export. Please select files to be included in the project settings.')
      )
      return false // Cannot export
    } else if (existingFilesWithSorting.length !== config.files.length) {
      await dialog.showMessageBox({
        title: trans('Project File Mismatch'),
        message: trans('One or more files specified in the project settings have not been found. They may have moved or been deleted. Please verify that all files that you would like to export are included.'),
        buttons: [trans('Ok')]
      }) // Don't return, because we still can export
    }

    // We have to fetch both the regular as well as the custom defaults profiles.
    const regularDefaults = await this._app.assets.listDefaults()
    const customDefaults = getCustomProfiles()
    const allDefaults = regularDefaults.concat(customDefaults)

    for (const profilePathOrCommand of config.profiles) {
      // Spin up one exporter per format.
      const profile = allDefaults.find(e => e.name === profilePathOrCommand)
      const command = this._app.config.get().export.customCommands.find(c => c.command === profilePathOrCommand)

      if (profile === undefined && command === undefined) {
        this._app.log.warning(`Could not export project ${dir.name} using profile or command ${profilePathOrCommand}: Not found`)
        continue
      }

      // Now check if it's actually a custom export because that will be pretty
      // much easier than the regular exports.
      try {
        if (command !== undefined) {
          await exportUsingCustomCommand(this._app, dir, config, command)
        } else if (profile !== undefined) {
          await exportUsingProfile(this._app, dir, config, profile)
        }
      } catch (err: unknown) {
        this._app.log.error(err instanceof Error ? err.message : 'unknown error', err)
        if (err instanceof Error) {
          this._app.windows.showErrorMessage(
            ('title' in err) ? String(err.title) : err.message,
            err.message,
            ('additionalInfo' in err) ? String(err.additionalInfo) : ''
          )
        }
      }
    }

    const notificationShown = showNativeNotification(
      trans('Project "%s" successfully exported. Click to show.', config.title),
      trans('Project Export'),
      () => {
        openDirectory(this._app.log, dir.path)
      }
    )

    if (!notificationShown) {
      openDirectory(this._app.log, dir.path)
    }

    return true
  }
}

/**
 * Exports a given project using a custom command.
 *
 * @param   {AppServiceContainer}  app      The ASC
 * @param   {DirDescriptor}        dir      The directory
 * @param   {ProjectSettings}      config   The project settings
 * @param   {string}               command  The command
 */
async function exportUsingCustomCommand (app: AppServiceContainer, dir: DirDescriptor, config: ProjectSettings, command: { displayName: string, command: string }) {
  const task = app.lrt.registerTask(
    trans('Exporting project "%s"', config.title),
    trans('Exporting using custom command %s', command.displayName)
  )

  app.log.info(`[Project] Exporting ${config.title} using custom command ${command.displayName}.`)
  try {
    const output = await runShellCommand(command.command, [`'${dir.path}'`], dir.path)
    if (output.code !== 0) {
      const err = new Error(trans('Project export failed: %s', output.stderr))
      task.endTask('error', err)
      throw err
    }
    task.endTask('success')
  } catch (err: unknown) {
    if (!(err instanceof Error)) {
      app.log.error('[Project] Export failed with an unknown error', err)
    } else {
      task.update({
        title: trans('Could not export project "%s".', config.title),
        info: trans('Export with command %s was unsuccessful: %s.', command.displayName, err.message)
      })
      task.endTask('error', err)
      app.log.error(`[Project] Export failed: ${err.message}`, err)
    }
    throw err
  }
}

/**
 * Exports a project using a profile.
 *
 * @param   {AppServiceContainer}    app      The ASC
 * @param   {DirDescriptor}          dir      The directory
 * @param   {ProjectSettings}        config   The project settings
 * @param   {PandocProfileMetadata}  profile  The profile
 */
async function exportUsingProfile (app: AppServiceContainer, dir: DirDescriptor, config: ProjectSettings, profile: PandocProfileMetadata) {
  const projectTitle = dir.settings.project?.title ?? dir.name
  const task = app.lrt.registerTask(
    trans('Exporting project "%s"', projectTitle),
    trans('Exporting using custom command %s', profile.name)
  )

  // Now, we have to retrieve the files. We have a directory descriptor that
  // contains a list of existing files on disk, and we have a project config
  // that specifies files and a sorting for export. We need to check that all
  // files specified in the config still exist. If a file is missing, display
  // a warning but export anyway.
  const availableFiles = await app.fsal.readDirectoryRecursively(dir.path)

  const existingFilesWithSorting = config.files
    // Since we default to always using Unix paths, to make the magic work on
    // Windows, we here have to map the relative paths in the project config
    // (back) to the Windows conventions by replacing / with \\.
    .map(file => process.platform === 'win32' ? pathToWin(file) : file)
    .map(file => path.join(dir.path, file))
    .filter(file => availableFiles.includes(file))

  const sourceFiles = existingFilesWithSorting.map(file => {
    return { path: file, name: path.basename(file), ext: path.extname(file) }
  })

  let template
  if (profile.writer === 'html' && config.templates.html !== '') {
    template = config.templates.html
  } else if (profile.writer === 'pdf' && config.templates.tex !== '') {
    template = config.templates.tex
  }

  const opt: ExporterOptions = {
    profile,
    sourceFiles,
    targetDirectory: dir.path,
    cwd: dir.path,
    defaultsOverride: {
      title: config.title,
      csl: (typeof config.cslStyle === 'string' && config.cslStyle.length > 0) ? config.cslStyle : undefined,
      template
    }
  }

  try {
    app.log.info(`[Project] Exporting ${projectTitle} using profile ${profile.name}.`)
    const result = await makeExport(opt, app.log, app.config, app.assets)
    if (result.code !== 0) {
      // Error
      const err = new Error(trans('Export failed: %s', result.stderr.join('\n')))
      task.update({
        title: trans('Could not export project "%s".', config.title),
        info: trans('Export with profile %s was unsuccessful: %s.', profile.name, err.message)
      })
      task.endTask('error', err)
      throw err
    } else {
      task.update({
        title: trans('Project "%s" has been exported.', config.title),
        info: trans('Exported project using profile %s.', profile.name)
      })
      task.endTask('success')
    }
  } catch (err: unknown) {
    if (!(err instanceof Error)) {
      app.log.error('[Project] Export failed with an unknown error', err)
    } else {
      task.update({
        title: trans('Could not export project "%s".', config.title),
        info: trans('Export with profile %s was unsuccessful: %s.', profile.name, err.message)
      })
      task.endTask('error', err)
      app.log.error(`[Project] Export failed: ${err.message}`, err)
    }
    throw err
  }
}

function openDirectory (logger: LogProvider, dirPath: string): void {
  // Whoever thought it would be great to have an async function RESOLVE
  // with the error instead of rejecting was definitely a f***ing genius.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  shell.openPath(dirPath)
    .then((error) => {
      if (error !== '') {
        logger.error(`[Project Export] Error opening the directory: ${error}`, error)
      }
    })
}
