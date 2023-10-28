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
import chokidar from 'chokidar'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'
import type { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '@dts/common/fsal'

type ChokidarEvents = 'add'|'addDir'|'change'|'unlink'|'unlinkDir'

/**
 * This class generates the Tray in the system notification area
 */
export default class WorkspaceProvider extends ProviderContract {
  private readonly filetree: Array<DirDescriptor|MDFileDescriptor|CodeFileDescriptor>
  private readonly _process: chokidar.FSWatcher

  /**
   * Create the instance on program start and setup services.
   */
  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider
  ) {
    super()
    this.filetree = []

    // chokidar's ignored-setting is compatible to anymatch, so we can
    // pass an array containing the standard dotted directory-indicators,
    // directories that should be ignored and a function that returns true
    // for all files that are _not_ in the filetypes list (whitelisting)
    // Further reading: https://github.com/micromatch/anymatch
    const ignoreDirs = [
      // Ignore dot-dirs/files, except .git (to detect changes to possible
      // git-repos) and .ztr-files (which contain, e.g., directory settings)
      // /(?:^|[/\\])\.(?!git|ztr-.+).+/ // /(^|[/\\])\../
      /(?:^|[/\\])\.(?!git$|ztr-[^\\/]+$).+/
    ]

    const options: chokidar.WatchOptions = {
      useFsEvents: process.platform === 'darwin',
      ignored: ignoreDirs,
      persistent: true,
      ignoreInitial: false, // Do not track the initial watch as changes
      followSymlinks: true, // Follow symlinks
      ignorePermissionErrors: true, // In the worst case one has to reboot the software, but so it looks nicer.

      // Chokidar should always be using fsevents, but we will be leaving this
      // in here both in case something happens in the future, and for nostalgic
      // reasons.
      interval: 5000,
      binaryInterval: 5000
    }

    this._process = new chokidar.FSWatcher(options)

    this._process.on('all', (eventName, eventPath) => {
      this.processEvent(eventName, eventPath)
        .catch(err => {
          this._logger.error(`[Workspace Provider] Could not handle event ${eventName}:${eventPath}`, err)
        })
    })
  }

  /**
   * Boots the provider
   */
  async boot (): Promise<void> {
    this._logger.verbose('Workspace provider booting up ...')
    const { openPaths } = this._config.get()
    // Begin watching the root paths from the config
    this._process.add(openPaths)
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Workspace provider shutting down ...')
    // NOTE: We MUST under all circumstances properly call the close() function
    // on every chokidar process we utilize. Otherwise, the fsevents dylib will
    // still hold on to some memory after the Electron process itself shuts down
    // which will result in a crash report appearing on macOS.
    await this._process.close()
  }

  async processEvent (eventName: ChokidarEvents, eventPath: string): Promise<void> {
    console.log('EVENT:', eventName, eventPath)
  }
}
