/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateProjectProperties command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command updates one or more project properties.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import expandOptionObject from '../../common/util/expand-option-object'

export default class UpdateProjectProperties extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'update-project-properties')
  }

  /**
    * Display the project settings
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<void> {
    // The properties come from the renderer with dot notation, but the action
    // expects them already in their expanded state.
    let expanded = expandOptionObject(arg.properties)
    // Find the directory, and apply the properties to it!
    let dir = this._app.findDir(arg.hash)
    if (dir !== null) {
      await this._app.getFileSystem().updateProject(dir, expanded)
    } else {
      global.log.warning(`Could not update project properties for ${String(arg.hash)}: No directory found!`)
    }
  }
}
