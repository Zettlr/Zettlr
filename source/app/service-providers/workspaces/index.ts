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

import { ipcMain } from 'electron'
import { Root } from './root'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'
import type FSAL from '@providers/fsal'
import broadcastIPCMessage from '@common/util/broadcast-ipc-message'

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

    ipcMain.handle('workspace-provider', (event, { command, payload }) => {
      // A renderer has asked for updates
      if (command === 'get-initial-tree-data') {
        console.log('RECEIVED REQUEST TO RETRIEVE WORKSPACES')
        for (const root of this.roots) {
          if (root.rootPath === payload) {
            return root.getInitialTreeData()
          }
        }

        // TODO: Remove this piece of code once we have the ability to only
        // request select workspaces
        if (payload === '') {
          return this.roots.map(root => root.getInitialTreeData())
        }
      } else if (command === 'get-changes-since') {
        console.log('RECEIVED REQUEST TO RETRIEVE CHANGES')
        const { rootPath, version } = payload
        for (const root of this.roots) {
          if (root.rootPath === rootPath) {
            return root.getChangesSince(version)
          }
        }

        throw new Error(`Could not retrieve changes for root ${rootPath as string}: Not loaded`)
      }
    })
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
    this._logger.verbose('Workspace provider booting up ...')

    const callbacks = {
      onChange: (rootPath: string) => {
        // TODO: Announce via IPC broadcast
        this._logger.info(`[WorkspaceManager] Root ${rootPath} has changed`)
        broadcastIPCMessage('workspace-changed', rootPath)
      },
      onUnlink: (rootPath: string) => {
        // TODO: Remove and announce!
        this._logger.warning(`[WorkspaceManager] Root ${rootPath} has been removed`)
      }
    }

    const { openPaths } = this._config.get()
    for (const rootPath of openPaths) {
      try {
        const descriptor = await this._fsal.loadAnyPath(rootPath)
        if (descriptor === undefined) {
          // Mount a "dummy" workspace indicating an unlinked root
          this._logger.error(`Could not load root ${rootPath}. Mounting dummy...`)
          const root = new Root(
            this._fsal.loadDummyDirectoryDescriptor(rootPath),
            this._logger,
            this._fsal,
            callbacks
          )
          this.roots.push(root)
        } else {
          // Mount a managing root
          const root = new Root(
            descriptor,
            this._logger,
            this._fsal,
            callbacks
          )
          this.roots.push(root)
        }
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
