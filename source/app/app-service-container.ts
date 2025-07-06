/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AppServiceContainer class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The application service container holds references to
 *                  singleton instances of every service provider.
 *
 * END HEADER
 */

// Providers
import AppearanceProvider from '@providers/appearance'
import AssetsProvider from '@providers/assets'
import CiteprocProvider from '@providers/citeproc'
import CommandProvider from '@providers/commands'
import ConfigProvider from '@providers/config'
import CssProvider from '@providers/css'
import DictionaryProvider from '@providers/dictionary'
import DocumentManager from '@providers/documents'
import FSAL from '@providers/fsal'
import LinkProvider from '@providers/links'
import LogProvider from '@providers/log'
import MenuProvider from '@providers/menu'
import type ProviderContract from '@providers/provider-contract'
import RecentDocumentsProvider from '@providers/recent-docs'
import StatsProvider from '@providers/stats'
import TagProvider from '@providers/tags'
import TargetProvider from '@providers/targets'
import TrayProvider from '@providers/tray'
import UpdateProvider from '@providers/updates'
import WindowProvider from '@providers/windows'
import WorkspaceProvider from '@providers/workspaces'
import { dialog } from 'electron'

// We need module-global variables so that garbage collect won't shut down the
// providers before the app is shut down.
let appServiceContainer: AppServiceContainer|undefined

// TODO: This function makes no sense in this module; find a better place!
/**
 * Retrieve the single App Service Container.
 *
 * @return  {AppServiceContainer}  The app service container.
 */
export function getAppServiceContainer (): AppServiceContainer {
  if (appServiceContainer === undefined || !appServiceContainer.isBooted) {
    throw new Error('Do not access the app service container before boot')
  }

  return appServiceContainer
}

/**
 * Returns true after the app service container is booted.
 *
 * @return  {boolean}  Whether the app service container is booted.
 */
export function isAppServiceContainerReady (): boolean {
  return appServiceContainer?.isBooted ?? false
}

export function setAppServiceContainer (container: AppServiceContainer) {
  appServiceContainer = container
}

export class AppServiceContainer {
  private readonly _appearanceProvider: AppearanceProvider
  private readonly _assetsProvider: AssetsProvider
  private readonly _citeprocProvider: CiteprocProvider
  private readonly _commandProvider: CommandProvider
  private readonly _configProvider: ConfigProvider
  private readonly _cssProvider: CssProvider
  private readonly _dictionaryProvider: DictionaryProvider
  private readonly _linkProvider: LinkProvider
  private readonly _logProvider: LogProvider
  private readonly _menuProvider: MenuProvider
  private readonly _recentDocsProvider: RecentDocumentsProvider
  private readonly _statsProvider: StatsProvider
  private readonly _tagProvider: TagProvider
  private readonly _targetProvider: TargetProvider
  private readonly _trayProvider: TrayProvider
  private readonly _updateProvider: UpdateProvider
  private readonly _windowProvider: WindowProvider
  private readonly _fsal: FSAL
  private readonly _documentManager: DocumentManager
  private readonly _workspaces: WorkspaceProvider
  private _isBooted: boolean

  constructor () {
    // NOTE: We need to instantiate the providers according to their dependence
    // on other providers.
    this._isBooted = false

    // First section: Crucial providers
    this._logProvider = new LogProvider()
    this._configProvider = new ConfigProvider(this._logProvider)
    this._fsal = new FSAL(this._logProvider, this._configProvider)

    // Now according to their dependencies
    this._recentDocsProvider = new RecentDocumentsProvider(this._logProvider)
    this._assetsProvider = new AssetsProvider(this._logProvider)
    this._cssProvider = new CssProvider(this._logProvider)
    this._statsProvider = new StatsProvider(this._logProvider)

    this._appearanceProvider = new AppearanceProvider(this._logProvider, this._configProvider)
    this._dictionaryProvider = new DictionaryProvider(this._logProvider, this._configProvider)

    this._workspaces = new WorkspaceProvider(this._logProvider, this._configProvider, this._fsal)
    this._targetProvider = new TargetProvider(this._logProvider, this._fsal)
    this._linkProvider = new LinkProvider(this._logProvider, this._workspaces)
    
    // The document provider accesses only the FSAL in its constructor
    this._documentManager = new DocumentManager(this)
    this._tagProvider = new TagProvider(this._logProvider, this._documentManager, this._workspaces)
    this._windowProvider = new WindowProvider(this._logProvider, this._configProvider, this._documentManager)

    this._citeprocProvider = new CiteprocProvider(this._logProvider, this._configProvider, this._windowProvider)
    this._trayProvider = new TrayProvider(this._logProvider, this._configProvider, this._windowProvider)

    // The command provider only needs the container for running the commands,
    // none of which will run during the boot cycle.
    this._commandProvider = new CommandProvider(this)
    this._menuProvider = new MenuProvider(this._logProvider, this._configProvider, this._recentDocsProvider, this._commandProvider, this._windowProvider, this._documentManager)
    this._updateProvider = new UpdateProvider(this._logProvider, this._configProvider, this._commandProvider, this._windowProvider)
  }

  /**
   * Boots up all service providers which need to be ready before the
   * application can be used.
   */
  async boot (): Promise<void> {
    // NOTE: We need to boot the providers in roughly the same order as we
    // instantiate them to ensure that their boot functions work properly. We
    // can't do this in the exact same order, because the dependencies are only
    // required for the variables, while the boot function may access them in
    // different order.
    await this._informativeBoot(this._logProvider, 'LogProvider')
    await this._informativeBoot(this._configProvider, 'ConfigProvider')
    await this._informativeBoot(this._fsal, 'FSAL')

    await this._informativeBoot(this._recentDocsProvider, 'RecentDocsProvider')
    await this._informativeBoot(this._assetsProvider, 'AssetsProvider')
    await this._informativeBoot(this._cssProvider, 'CSSProvider')
    await this._informativeBoot(this._statsProvider, 'StatsProvider')

    await this._informativeBoot(this._appearanceProvider, 'AppearanceProvider')
    await this._informativeBoot(this._dictionaryProvider, 'DictionaryProvider')

    await this._informativeBoot(this._workspaces, 'WorkspaceProvider')
    await this._informativeBoot(this._targetProvider, 'TargetProvider')
    await this._informativeBoot(this._linkProvider, 'LinkProvider')

    // Boot the commands before the window provider to ensure the handler for
    // application requests from windows is registered before any window opens
    await this._informativeBoot(this._commandProvider, 'CommandProvider')
    await this._informativeBoot(this._windowProvider, 'WindowManager')

    await this._informativeBoot(this._tagProvider, 'TagProvider')
    await this._informativeBoot(this._trayProvider, 'TrayProvider')
    await this._informativeBoot(this._citeprocProvider, 'CiteprocProvider')
    
    await this._informativeBoot(this._documentManager, 'DocumentManager')
    await this._informativeBoot(this._menuProvider, 'MenuProvider')
    await this._informativeBoot(this._updateProvider, 'UpdateProvider')

    this._menuProvider.set() // TODO

    this.log.info('[AppServiceContainer] Boot successful!')
    this._isBooted = true

    // Now that the config provider is definitely set up, let's see if we
    // should copy the interactive tutorial to the documents directory.
    if (this.config.isFirstStart()) {
      this.log.info('[AppServiceContainer] Copying over the interactive tutorial!')
      this.commands.run('tutorial-open', {})
        .catch(err => this.log.error('[AppServiceContainer] Could not open tutorial', err))
    }

    // After everything has been booted up, show the windows
    this.windows.maybeShowWindows()
  }

  public get isBooted () { return this._isBooted }

  /**
   * Returns the appearance provider
   */
  public get appearance (): AppearanceProvider { return this._appearanceProvider }

  /**
   * Returns the assets provider
   */
  public get assets (): AssetsProvider { return this._assetsProvider }

  /**
   * Returns the citeproc provider
   */
  public get citeproc (): CiteprocProvider { return this._citeprocProvider }

  /**
   * Returns the config provider
   */
  public get config (): ConfigProvider { return this._configProvider }

  /**
   * Returns the CSS provider
   */
  public get css (): CssProvider { return this._cssProvider }

  /**
   * Returns the dictionary provider
   */
  public get dictionary (): DictionaryProvider { return this._dictionaryProvider }

  /**
   * Returns the link provider
   */
  public get links (): LinkProvider { return this._linkProvider }

  /**
   * Returns the log provider
   */
  public get log (): LogProvider { return this._logProvider }

  /**
   * Returns the menu provider
   */
  public get menu (): MenuProvider { return this._menuProvider }

  /**
   * Returns the recent docs provider
   */
  public get recentDocs (): RecentDocumentsProvider { return this._recentDocsProvider }

  /**
   * Returns the stats provider
   */
  public get stats (): StatsProvider { return this._statsProvider }

  /**
   * Returns the tags provider
   */
  public get tags (): TagProvider { return this._tagProvider }

  /**
   * Returns the target provider
   */
  public get targets (): TargetProvider { return this._targetProvider }

  /**
   * Returns the tray provider
   */
  public get tray (): TrayProvider { return this._trayProvider }

  /**
   * Returns the update provider
   */
  public get updates (): UpdateProvider { return this._updateProvider }

  /**
   * Returns the window manager
   */
  public get windows (): WindowProvider { return this._windowProvider }

  /**
   * Returns the FSAL
   */
  public get fsal (): FSAL { return this._fsal }

  /**
   * Returns the DocumentManager
   */
  public get documents (): DocumentManager { return this._documentManager }

  /**
   * Returns the command provider
   */
  public get commands (): CommandProvider { return this._commandProvider }

  /**
   * Returns the WorkspaceProvider
   */
  public get workspaces (): WorkspaceProvider { return this._workspaces }

  /**
   * Prepares quitting the app by shutting down the service providers
   */
  async shutdown (): Promise<void> {
    await this._safeShutdown(this._commandProvider, 'CommandProvider')
    await this._safeShutdown(this._documentManager, 'DocumentManager')
    await this._safeShutdown(this._fsal, 'FSAL')

    await this._safeShutdown(this._windowProvider, 'WindowManager')
    await this._safeShutdown(this._trayProvider, 'TrayProvider')
    await this._safeShutdown(this._statsProvider, 'StatsProvider')
    await this._safeShutdown(this._updateProvider, 'UpdateProvider')
    await this._safeShutdown(this._cssProvider, 'CSSProvider')
    await this._safeShutdown(this._targetProvider, 'TargetProvider')
    await this._safeShutdown(this._linkProvider, 'LinkProvider')
    await this._safeShutdown(this._tagProvider, 'TagProvider')
    await this._safeShutdown(this._menuProvider, 'MenuProvider')
    await this._safeShutdown(this._recentDocsProvider, 'RecentDocsProvider')
    await this._safeShutdown(this._dictionaryProvider, 'DictionaryProvider')
    await this._safeShutdown(this._citeprocProvider, 'CiteprocProvider')
    await this._safeShutdown(this._assetsProvider, 'AssetsProvider')
    await this._safeShutdown(this._appearanceProvider, 'AppearanceProvider')
    await this._safeShutdown(this._workspaces, 'WorkspaceProvider')
    await this._safeShutdown(this._configProvider, 'ConfigProvider')
    await this._safeShutdown(this._logProvider, 'LogProvider')
  }

  /**
   * A utility function to safely shut down providers. (If one throws an error
   * all others still should be able to shut down)
   *
   * @param  {ProviderContract}  provider  The provider to shut down
   */
  private async _safeShutdown <T extends ProviderContract> (provider: T, displayName: string): Promise<void> {
    try {
      await provider.shutdown()
    } catch (err: any) {
      const title = `Error shutting down ${displayName}`
      const message = `Could not shut down ${displayName}: ${err.message as string}`
      dialog.showErrorBox(title, message)
      this._logProvider.error(`[AppServiceContainer] ${message}`, err)
    }
  }

  /**
   * Similar to safeShutdown, this utility function provides a similar
   * experience during boot. The only difference is that errors won't be caught
   * here, since an error in any provider indicates that it is not safe to
   * continue to boot the app.
   *
   * @param  {ProviderContract}  provider  The provider to boot
   */
  private async _informativeBoot <T extends ProviderContract> (provider: T, displayName: string): Promise<void> {
    try {
      await provider.boot()
    } catch (err: any) {
      const title = `Error starting ${displayName}`
      const message = `Could not start ${displayName}: ${err.message as string}`
      dialog.showErrorBox(title, message)
      this._logProvider.error(`[AppServiceContainer] ${message}`, err)
      throw err // Re-Throw since we need to quit the app now.
    }
  }
}
