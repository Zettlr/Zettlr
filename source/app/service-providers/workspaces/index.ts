/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        WorkspaceProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This service provider manages all loaded root paths, i.e.
 *                  the workspaces and root files. It ensures to keep a tap on
 *                  what is changing on disk and keeps a log so that multiple
 *                  displays (a.k.a. the renderer's file managers) can keep
 *                  themselves up to date.
 *
 * END HEADER
 */

import {} from 'electron'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'

/**
 * This class generates the Tray in the system notification area
 */
export default class WorkspaceProvider extends ProviderContract {
  /**
   * Create the instance on program start and setup services.
   */
  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider
  ) {
    super()
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
    this._logger.verbose('Workspace provider booting up ...')
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Workspace provider shutting down ...')
  }
}
