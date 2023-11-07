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
import { Root } from './root'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'
import type FSAL from '@providers/fsal'

/**
 * This class generates the Tray in the system notification area
 */
export default class WorkspaceProvider extends ProviderContract {
  private readonly roots: Root[]
  /**
   * Create the instance on program start and setup services.
   */
  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _fsal: FSAL
  ) {
    super()
    this.roots = []
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
    this._logger.verbose('Workspace provider booting up ...')
    const { openPaths } = this._config.get()
    for (const rootPath of openPaths) {
      try {
        const descriptor = await this._fsal.loadAnyPath(rootPath)
        if (descriptor === undefined) {
          throw new Error(`Could not load root ${rootPath}`)
        }

        const root = new Root(
          descriptor,
          this._logger,
          this._fsal,
          {
            onChange: (rootPath) => {
              // TODO: Announce via IPC broadcast
              this._logger.info(`[WorkspaceManager] Root ${rootPath} has changed`)
            },
            onUnlink: (rootPath) => {
              // TODO: Remove and announce!
              this._logger.warning(`[WorkspaceManager] Root ${rootPath} has been removed`)
            }
          }
        )
        this.roots.push(root)
      } catch (err: any) {
        // TODO
      }
    }
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Workspace provider shutting down ...')
  }
}
