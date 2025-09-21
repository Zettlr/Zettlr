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
import EventEmitter from 'events'
import { getIDRE } from '@common/regular-expressions'
import findObject from '@common/util/find-object'
import type { AnyDescriptor, CodeFileDescriptor, DirDescriptor, MDFileDescriptor, OtherFileDescriptor } from '@dts/common/fsal'
import locateByPath from '@providers/fsal/util/locate-by-path'
import { showSplashScreen, closeSplashScreen, updateSplashScreen } from './splash-screen'
import { trans } from '@common/i18n-main'
import path from 'path'
import { performance } from 'perf_hooks'
import objectToArray from '@common/util/object-to-array'
import generateStats, { type WorkspacesStatistics } from './generate-stats'
import { hasMarkdownExt, MD_EXT } from '@common/util/file-extention-checks'

export enum WORKSPACE_PROVIDER_EVENTS {
  WorkspaceAdded = 'workspace-added',
  WorkspaceChanged = 'workspace-changed',
  WorkspaceRemoved = 'workspace-removed'
}

/**
 * This class manages all workspaces that are loaded within the app and provides
 * functionality to access all files and folders within there. In addition, this
 * class provides the required functionality to keep the renderers (i.e., the
 * file managers) in sync.
 */
export default class WorkspaceProvider extends ProviderContract {
  private readonly roots: Root[]
  private readonly emitter: EventEmitter
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
    this.emitter = new EventEmitter()

    ipcMain.handle('workspace-provider', (event, { command, payload }) => {
      // A renderer has asked for updates
      if (command === 'get-initial-tree-data') {
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
    await this.syncLoadedRoots()

    this._config.on('update', (which: string) => {
      if (which === 'openPaths') {
        this.syncLoadedRoots().catch(err => {
          this._logger.error(`[WorkspaceProvider] Could not synchronize paths: ${err.message as string}`, err)
        })
      }
    })
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Workspace provider shutting down ...')
    for (const root of this.roots) {
      await root.prepareShutdown()
    }
  }

  /**
   * Synchronizes the loaded roots with the configuration's openPaths property.
   */
  private async syncLoadedRoots (): Promise<void> {
    const callbacks = {
      onChange: (rootPath: string) => {
        this._logger.info(`[WorkspaceManager] Root ${rootPath} has changed`)
        broadcastIPCMessage(WORKSPACE_PROVIDER_EVENTS.WorkspaceChanged, rootPath)
        this.emitter.emit(WORKSPACE_PROVIDER_EVENTS.WorkspaceChanged, rootPath)
      },
      onUnlink: (rootPath: string) => {
        this._logger.warning(`[WorkspaceManager] Root ${rootPath} has been removed`)
        const affectedRoot = this.roots.find(r => r.rootPath === rootPath)
        if (affectedRoot !== undefined && affectedRoot.rootDescriptor.type === 'directory') {
          // Manually splice out the descriptor and call synchronizePaths, which
          // will notice that the descriptor is missing, cannot find it, and instead
          // replace it with a "not found" directory.
          this.roots.splice(this.roots.indexOf(affectedRoot), 1)
          affectedRoot.prepareShutdown()
            .catch(err => this._logger.error('[WorkspaceProvider] ' + String(err.message), err))
          this.syncLoadedRoots()
            .catch(err => this._logger.error('[WorkspaceProvider] ' + String(err.message), err))
        } else {
          // This will, via event emmission, remove the root from here as well
          this._config.removePath(rootPath)
        }
      }
    }

    const { openPaths } = this._config.get()

    // If the provider isn't done loading after 1 second, begin displaying a
    // splash screen to indicate to the user that things are happening, even if
    // the main window(s) don't yet show.
    const timeout = setTimeout(() => {
      showSplashScreen(this._logger)
    }, 1000)
    let currentPercent = 0

    // Start a timer to measure how long the roots take to load.
    const start = performance.now()

    for (const rootPath of openPaths) {
      updateSplashScreen(trans('Loading workspace %s', path.basename(rootPath)), currentPercent)
      currentPercent += Math.round(1 / openPaths.length * 100)

      if (this.roots.find(root => root.rootPath === rootPath) !== undefined) {
        continue // This path has already been loaded
      }

      try {
        const descriptor = await this._fsal.loadAnyPath(rootPath)
        if (descriptor === undefined) {
          // Mount a "dummy" workspace indicating an unlinked root
          this._logger.error(`Could not load root ${rootPath}. Mounting dummy...`)
          const root = new Root(
            this._fsal.loadDummyDirectoryDescriptor(rootPath),
            this._logger,
            this._config,
            this._fsal,
            callbacks
          )
          this.roots.push(root)
        } else {
          // Mount a managing root
          const root = new Root(
            descriptor,
            this._logger,
            this._config,
            this._fsal,
            callbacks
          )
          this.roots.push(root)
        }

        broadcastIPCMessage(WORKSPACE_PROVIDER_EVENTS.WorkspaceAdded, rootPath)
        this.emitter.emit(WORKSPACE_PROVIDER_EVENTS.WorkspaceAdded, rootPath)
      } catch (err: any) {
        // TODO
      }
    }

    // Round to max. two positions after the period
    const duration = Math.floor((performance.now() - start) / 1000 * 100) / 100
    this._logger.info(`[Workspace Provider] Synchronized roots in ${duration} seconds`)
    clearTimeout(timeout)
    closeSplashScreen()

    // Before finishing up, unload all roots that are no longer part of the
    // config
    for (const rootPath of this.roots.map(r => r.rootPath)) {
      if (!openPaths.includes(rootPath)) {
        const affectedRoot = this.roots.find(r => r.rootPath === rootPath)
        if (affectedRoot === undefined) {
          continue
        }
        await affectedRoot.prepareShutdown()
        this.roots.splice(this.roots.indexOf(affectedRoot), 1)
        broadcastIPCMessage(WORKSPACE_PROVIDER_EVENTS.WorkspaceRemoved, rootPath)
        this.emitter.emit(WORKSPACE_PROVIDER_EVENTS.WorkspaceRemoved, rootPath)
      }
    }
  }

  // Enable global event listening to updates of the config
  on (evt: WORKSPACE_PROVIDER_EVENTS, callback: (...args: any[]) => void): void {
    this.emitter.on(evt, callback)
  }

  once (evt: WORKSPACE_PROVIDER_EVENTS, callback: (...args: any[]) => void): void {
    this.emitter.once(evt, callback)
  }

  // Also do the same for the removal of listeners
  off (evt: WORKSPACE_PROVIDER_EVENTS, callback: (...args: any[]) => void): void {
    this.emitter.off(evt, callback)
  }

  /**
   * Attempts to find a previously missing directory and load it
   *
   * @param  {string}  dirPath  The path to search for
   */
  public async rescanForDirectory (dirPath: string): Promise<void> {
    const affectedRoot = this.roots.find(r => r.rootPath === dirPath)
    if (affectedRoot === undefined) {
      this._logger.warning(`[WorkspaceProvider] Not trying to reload directory ${dirPath}: Not loaded`)
      return
    }

    try {
      const descriptor = await this._fsal.loadAnyPath(dirPath)
      if (descriptor !== undefined) {
        // The root is now available, so we can splice the fake descriptor and
        // re-synchronize
        await affectedRoot.prepareShutdown()
        this.roots.splice(this.roots.indexOf(affectedRoot), 1)
        await this.syncLoadedRoots()
      }
    } catch (err: any) {
      this._logger.info(`[WorkspaceProvider] Could not locate directory ${dirPath}: Still missing`)
    }
  }

  /**
   * Returns a map of all files to all links of these files across all loaded
   * workspaces.
   *
   * @return  {Map<string, string[]>}  A map of filepath -> link[]
   */
  public getLinks (): Map<string, string[]> {
    const mapList: Array<[string, string[]]> = []

    for (const root of this.roots) {
      mapList.push(...[...root.getLinks()]) // Destructor magic
    }

    return new Map(mapList)
  }

  /**
   * Returns a map of all files to all tags of these files across all loaded
   * workspaces.
   *
   * @return  {Map<string, string[]>}  A map of filepath -> tag[]
   */
  public getTags (): Map<string, string[]> {
    const mapList: Array<[string, string[]]> = []

    for (const root of this.roots) {
      mapList.push(...[...root.getTags()]) // Destructor magic
    }

    return new Map(mapList)
  }

  /**
   * Returns a map of all file IDs across all loaded workspaces.
   *
   * @return  {Map<string, string>}  A map of filepath -> ID
   */
  public getIds (): Map<string, string> {
    const idList: Array<[string, string]> = []

    for (const root of this.roots) {
      idList.push(...[...root.getIds()]) // More destructor magic
    }

    return new Map(idList)
  }

  /**
   * Returns an array of all files currently loaded into the Workspace Provider.
   *
   * @return  {Array<AnyFileDescriptor>}  An array of every file
   */
  public getAllFiles (): Array<MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor> {
    return objectToArray<any>(this.roots.map(root => root.rootDescriptor), 'children')
      .filter(descriptor => descriptor.type !== 'directory')
  }

  // DEBUG: MOVE TO WORKSPACES PROVIDER
  public getStatistics (): WorkspacesStatistics {
    return generateStats(this.roots.map(root => root.rootDescriptor))
  }

  /**
   * Attempts to find a given descriptor in the loaded trees.
   *
   * @param   {string}         absPath  The absolute path
   *
   * @return  {AnyDescriptor}           Any descriptor, or undefined.
   */
  public find (absPath: string): AnyDescriptor|undefined {
    const maybeFile = this.findFile(absPath)
    if (maybeFile !== undefined) {
      return maybeFile
    }

    return this.findDir(absPath)
  }

  /**
   * Searches for a file using the query, which can be either an ID (as
   * recognized by the RegExp pattern) or a filename (with or without extension)
   *
   * @param  {string}  query  What to search for
   */
  public findExact (query: string): MDFileDescriptor|undefined {
    const idREPattern = this._config.get().zkn.idRE
    const idRE = getIDRE(idREPattern, true)
    const allWorkspaces = this.roots.map(root => root.rootDescriptor)

    // First, let's see if what we got looks like an ID, or not. If it looks
    // like an ID, attempt to match it that way, else try to search for a
    // filename.
    if (idRE.test(query)) {
      // It's an ID
      return findObject(allWorkspaces, 'id', query, 'children')
    } else {
      if (hasMarkdownExt(query)) {
        return findObject(allWorkspaces, 'name', query, 'children')
      } else {
        // No file ending given, so let's test all allowed. The filetypes are
        // sorted by probability (first .md, then .markdown), to reduce the
        // amount of time spent on the tree.
        for (const type of MD_EXT) {
          const file = findObject(allWorkspaces, 'name', query + type, 'children')
          if (file !== undefined) {
            return file
          }
        }
      }
    }
  }

  /**
   * Attempts to find a directory in the loaded workspaces.
   *
   * @param  {string}                   dirPath  An absolute path to search for.
   *
   * @return {DirDescriptor|undefined}       Either undefined or the wanted directory
   */
  public findDir (dirPath: string): DirDescriptor|undefined {
    const baseTree = this.roots.map(root => root.rootDescriptor)
    const descriptor = locateByPath(baseTree, dirPath)
    if (descriptor === undefined || descriptor.type !== 'directory') {
      return undefined
    }

    return descriptor
  }

  /**
   * Attempts to find a file in the loaded workspaces.
   *
   * @param   {string}                             filePath    An absolute path to search for.
   *
   * @return  {MDFileDescriptor|CodeFileDescriptor|undefined}  Either the corresponding descriptor, or undefined
   */
  public findFile (filePath: string): MDFileDescriptor|CodeFileDescriptor|undefined {
    const baseTree = this.roots.map(root => root.rootDescriptor)
    const descriptor = locateByPath(baseTree, filePath)
    if (descriptor === undefined || (descriptor.type !== 'file' && descriptor.type !== 'code')) {
      return undefined
    }

    return descriptor
  }
}
