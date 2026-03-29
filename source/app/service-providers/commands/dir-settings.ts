/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirSettings command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Adjust the settings of a directory
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'
import type { DirDescriptor } from 'source/types/common/fsal'

export interface DirSettingsCommandAPI {
  path: string
  settings: Partial<DirDescriptor['settings']>
}

export default class DirSettings extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, ['set-directory-setting'])
  }

  /**
    * Sets the icon for a directory
    *
    * @param  {string}  evt  The event name
    * @param  {Object}  arg  An object containing both a hash and an icon
    */
  async run (evt: string, arg: DirSettingsCommandAPI): Promise<boolean> {
    const dir = await this._app.fsal.getAnyDirectoryDescriptor(arg.path)

    if (dir === undefined) {
      return false
    }

    await this._app.fsal.setDirectorySetting(dir, arg.settings)
    return true
  }
}
