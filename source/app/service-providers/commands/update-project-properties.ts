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

import type { ProjectSettings } from '@dts/common/fsal'
import ZettlrCommand from './zettlr-command'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class UpdateProjectProperties extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'update-project-properties')
  }

  /**
    * Display the project settings
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: { path: string, properties: ProjectSettings }): Promise<void> {
    // The properties come from the renderer with dot notation, but the action
    // expects them already in their expanded state.
    // let expanded = expandOptionObject(arg.properties)
    // Find the directory, and apply the properties to it!
    const dir = this._app.workspaces.findDir(arg.path)
    if (dir !== undefined) {
      await this._app.fsal.updateProject(dir, arg.properties)
    } else {
      this._app.log.warning(`Could not update project properties for ${String(arg.path)}: No directory found!`)
    }
  }
}
