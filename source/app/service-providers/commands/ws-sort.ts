/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        WorkspaceSort command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command applies a sorting to the root workspaces.
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export default class WorkspaceSort extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'sort-workspaces')
  }

  /**
   * Closes (not removes) either a directory or a file.
   * @param {String} evt The event name
   * @param  {Object} arg The hash of a root directory or file.
   */
  async run (evt: string, arg: string[]): Promise<boolean> {
    const { openWorkspaces } = this._app.config.get().app
    const { sortWorkspacesManually } = this._app.config.get().fileManager

    const sortOrder: Array<[ number, string ]> = openWorkspaces.map(ws => {
      return [ arg.indexOf(ws), ws ]
    })

    sortOrder.sort((a, b) => a[0] - b[0])

    const sameOrdering = openWorkspaces.every((ws, idx) => sortOrder[idx][1] === ws)

    if (sameOrdering) {
      return true // Order hasn't changed -> do nothing
    }

    // Apply the new sorting
    if (!sortWorkspacesManually) {
      this._app.config.set('fileManager.sortWorkspacesManually', true)
    }

    this._app.config.set('app.openWorkspaces', sortOrder.map(x => x[1]))

    return true
  }
}
