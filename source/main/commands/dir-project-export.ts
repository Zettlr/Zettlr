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
import objectToArray from '../../common/util/object-to-array'
import { makeExport } from '../modules/export'
import { filter as minimatch } from 'minimatch'
import { shell } from 'electron'
import { ExporterOptions } from '../modules/export/types'

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
    const dir = this._app.findDir(arg)

    if (dir === null) {
      global.log.error('Could not export project: Directory not found.')
      return false
    }

    const config = dir._settings.project

    if (config === null) {
      global.log.error(`Could not export project: Directory ${dir.name} is not a project.`)
      return false
    }

    // Receive a two dimensional array of all directory contents and remove all dirs.x
    let files = objectToArray(dir, 'children').filter(e => e.type !== 'directory')

    // Use minimatch to filter against the project's filter patterns
    for (const pattern of config.filters as string[]) {
      global.log.info(`[Project] Filtering fileset: Matching against "${pattern}"`)
      // NOTE: minimatch is actually just the "filter" function
      const match = minimatch(pattern, { matchBase: true })
      // NOTE: Since we're dealing with descriptors, and not paths, we have to
      // manually call the filter function providing the path-property rather
      // than the full object.
      files = files.filter((descriptor, index, arr) => match(descriptor.path, index, arr))
    }

    if (files.length === 0) {
      global.log.warning('[Project] Aborting export: No files remained after filtering.')
      return false
    }

    for (const format of config.formats as string[]) {
      // Spin up one exporter per format.
      global.log.info(`[Project] Exporting ${dir.name} as ${format}.`)
      try {
        const opt: ExporterOptions = {
          format: format,
          sourceFiles: files,
          targetDirectory: dir.path,
          title: config.title,
          cwd: dir.path
        }

        if (typeof config.cslStyle === 'string' && config.cslStyle.length > 0) {
          opt.cslStyle = config.cslStyle
        }

        const result = await makeExport(opt)
        if (result.code !== 0) {
          // We got an error!
          throw new Error(`Export failed: ${result.stderr.join('\n')}`)
        }
        global.log.info(`[Project] Exported ${dir.name} as ${result.targetFile}`)
      } catch (err: any) {
        global.log.error(err.message, err)
        global.application.displayErrorMessage(
          err.title || err.message,
          err.message,
          err.additionalInfo || ''
        )
      }
    }

    // TODO: Translate!
    const notificationShown = global.notify.normal('Project successfully exported. Click to show.', async () => {
      openDirectory(dir.path)
    })

    if (!notificationShown) {
      openDirectory(dir.path)
    }

    return true
  }
}

function openDirectory (dirPath: string): void {
  // Whoever thought it would be great to have an async function RESOLVE
  // with the error instead of rejecting was definitely a f***ing genius.
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  shell.openPath(dirPath)
    .then((error) => {
      if (error !== '') {
        global.log.error(`[Project Export] Error opening the directory: ${error}`, error)
      }
    })
}
