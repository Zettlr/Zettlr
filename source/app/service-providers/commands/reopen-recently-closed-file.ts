/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ReopenRecentlyClosedFile command
 * CVM-Role:        <none>
 * Maintainer:      Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     Reopens the most recently closed file, if any.
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export default class ReopenRecentlyClosedFile extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'reopen-recently-closed-file')
  }

  run (_evt: string, _arg: string): Promise<boolean> {
    const windowId = this._app.documents.windowKeys()[0]
    const leafId = this._app.documents.leafIds(windowId)[0]
    return this._app.documents.reopenRecentlyClosedFile(windowId, leafId)
  }
}
