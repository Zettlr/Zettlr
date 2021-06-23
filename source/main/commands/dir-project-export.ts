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

    // Receive a two dimensional array of all directory contents
    let files = objectToArray(dir, 'children')

    // Reduce to files-only
    files = files.filter((elem) => { return elem.type === 'file' })

    for (const format of config.formats as string[]) {
      // Spin up one exporter per format.
      global.log.info(`[Project] Exporting ${dir.name} as ${format}.`)
      try {
        const opt = {
          format: format,
          sourceFiles: files,
          targetDirectory: dir.path
        }

        const result = await makeExport(opt)
        if (result.code !== 0) {
          // We got an error!
          throw new Error(`Export failed: ${result.stderr.join('\n')}`)
        }
        global.log.info(`[Project] Exported ${dir.name} as ${result.targetFile}`)
      } catch (err) {
        global.log.error(err.message, err)
        global.application.displayErrorMessage(
          err.title || err.message,
          err.message,
          err.additionalInfo || ''
        )
      }
    }

    return true
  }
}
