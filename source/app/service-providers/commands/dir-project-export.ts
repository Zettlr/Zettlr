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
import objectToArray from '@common/util/object-to-array'
import { makeExport } from './exporter'
import minimatch from 'minimatch'
import { shell } from 'electron'
import type { ExporterOptions } from './exporter/types'
import type LogProvider from '@providers/log'
import { trans } from '@common/i18n-main'

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
    const dir = this._app.fsal.findDir(arg)

    if (dir === undefined) {
      this._app.log.error('Could not export project: Directory not found.')
      return false
    }

    const config = dir.settings.project

    if (config === null) {
      this._app.log.error(`Could not export project: Directory ${dir.name} is not a project.`)
      return false
    }

    // Receive a two dimensional array of all directory contents and remove all
    // directories as well as any non-code/MD file
    let files = objectToArray(dir, 'children').filter(e => e.type !== 'directory' && e.type !== 'other')

    // Use minimatch to filter against the project's filter patterns
    for (const pattern of config.filters) {
      this._app.log.info(`[Project] Filtering fileset: Matching against "${pattern}"`)
      // cf. https://github.com/isaacs/minimatch#minimatchfilterpattern-options
      files = files.filter(minimatch.filter(pattern, { matchBase: true }))
    }

    if (files.length === 0) {
      this._app.log.warning('[Project] Aborting export: No files remained after filtering.')
      return false
    }

    const allDefaults = await this._app.assets.listDefaults()

    for (const profilePath of config.profiles) {
      // Spin up one exporter per format.
      const profile = allDefaults.find(e => e.name === profilePath)

      if (profile === undefined) {
        this._app.log.warning(`Could not export project ${dir.name} using profile ${profilePath}: Not found`)
        continue
      }

      this._app.log.info(`[Project] Exporting ${dir.name} as ${profile.writer} (Profile: ${profile.name}).`)

      let template
      if (profile.writer === 'html' && config.templates.html !== '') {
        template = config.templates.html
      } else if (profile.writer === 'pdf' && config.templates.tex !== '') {
        template = config.templates.tex
      }

      try {
        const opt: ExporterOptions = {
          profile,
          sourceFiles: files,
          targetDirectory: dir.path,
          cwd: dir.path,
          defaultsOverride: {
            title: config.title,
            csl: (typeof config.cslStyle === 'string' && config.cslStyle.length > 0) ? config.cslStyle : undefined,
            template
          }
        }

        this._app.log.verbose(`[Project Export] Exporting ${opt.sourceFiles.length} files to ${opt.targetDirectory}`)

        const result = await makeExport(opt, this._app.log, this._app.config, this._app.assets)
        if (result.code !== 0) {
          // We got an error!
          throw new Error(`Export failed: ${result.stderr.join('\n')}`)
        }
        this._app.log.info(`[Project] Exported ${dir.name} as ${result.targetFile}`)
      } catch (err: any) {
        this._app.log.error(err.message, err)
        this._app.windows.showErrorMessage(
          ('title' in err) ? err.title : err.message,
          err.message,
          ('additionalInfo' in err) ? err.additionalInfo : ''
        )
      }
    }

    const notificationShown = this._app.notifications.show(trans('Project successfully exported. Click to show.'), trans('Export'), () => {
      openDirectory(this._app.log, dir.path)
    })

    if (!notificationShown) {
      openDirectory(this._app.log, dir.path)
    }

    return true
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
