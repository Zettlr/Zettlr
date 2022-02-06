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
import NotificationProvider from '@providers/notifications'
import ProviderContract from '@providers/provider-contract'
import RecentDocumentsProvider from '@providers/recent-docs'
import StatsProvider from '@providers/stats'
import TagProvider from '@providers/tags'
import TargetProvider from '@providers/targets'
import TranslationProvider from '@providers/translations'
import TrayProvider from '@providers/tray'
import UpdateProvider from '@providers/updates'
import WindowProvider from '@providers/windows'

export default class AppServiceContainer {
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
  private readonly _notificationProvider: NotificationProvider
  private readonly _recentDocsProvider: RecentDocumentsProvider
  private readonly _statsProvider: StatsProvider
  private readonly _tagProvider: TagProvider
  private readonly _targetProvider: TargetProvider
  private readonly _translationProvider: TranslationProvider
  private readonly _trayProvider: TrayProvider
  private readonly _updateProvider: UpdateProvider
  private readonly _windowProvider: WindowProvider
  private readonly _fsal: FSAL
  private readonly _documentManager: DocumentManager

  constructor () {
    // NOTE: The log and config providers need to be instantiated first. The
    // rest can be instantiated afterwards.
    this._logProvider = new LogProvider()
    this._configProvider = new ConfigProvider(this._logProvider)
    this._commandProvider = new CommandProvider(this)
    // NOTE: This provider still produces side effects
    this._translationProvider = new TranslationProvider(this._logProvider, this._configProvider)
    this._assetsProvider = new AssetsProvider(this._logProvider)
    this._linkProvider = new LinkProvider(this._logProvider)
    this._tagProvider = new TagProvider(this._logProvider)
    this._cssProvider = new CssProvider(this._logProvider)
    this._notificationProvider = new NotificationProvider(this._logProvider)
    this._statsProvider = new StatsProvider(this._logProvider)
    this._recentDocsProvider = new RecentDocumentsProvider(this._logProvider)
    this._appearanceProvider = new AppearanceProvider(this._logProvider, this._configProvider)
    this._dictionaryProvider = new DictionaryProvider(this._logProvider, this._configProvider)
    this._citeprocProvider = new CiteprocProvider(this._logProvider, this._configProvider, this._notificationProvider, this._windowProvider)

    this._targetProvider = new TargetProvider(this._logProvider)
    this._fsal = new FSAL(this._logProvider, this._configProvider, this._targetProvider, this._tagProvider, this._linkProvider)
    this._documentManager = new DocumentManager(
      this._logProvider,
      this._configProvider,
      this._recentDocsProvider,
      this._citeprocProvider,
      this._fsal,
      this._linkProvider,
      this._targetProvider,
      this._tagProvider
    )
    this._windowProvider = new WindowProvider(this._logProvider, this._configProvider, this._documentManager)
    this._trayProvider = new TrayProvider(this._logProvider, this._configProvider, this._windowProvider)
    this._menuProvider = new MenuProvider(this._logProvider, this._configProvider, this._recentDocsProvider, this._commandProvider, this._windowProvider)
    this._updateProvider = new UpdateProvider(this._logProvider, this._configProvider, this._notificationProvider, this._commandProvider)
  }

  async boot (): Promise<void> {
    await this._logProvider.boot()
    await this._configProvider.boot()
    await this._translationProvider.boot()
    await this._assetsProvider.boot()
    await this._linkProvider.boot()
    await this._tagProvider.boot()
    await this._targetProvider.boot()
    await this._cssProvider.boot()
    await this._notificationProvider.boot()
    await this._statsProvider.boot()
    await this._recentDocsProvider.boot()
    await this._appearanceProvider.boot()
    // Boot the commands before the window provider to ensure the handler for
    // application requests from windows is registered before any window opens
    await this._commandProvider.boot()
    await this._windowProvider.boot()
    await this._trayProvider.boot()
    await this._dictionaryProvider.boot()
    await this._menuProvider.boot()
    await this._citeprocProvider.boot() // --> WindowProvider
    await this._updateProvider.boot() // --> CommandProvider

    await this._fsal.boot()
    await this._documentManager.boot()

    this._menuProvider.set() // TODO
  }

  public get appearance (): AppearanceProvider { return this._appearanceProvider }
  public get assets (): AssetsProvider { return this._assetsProvider }
  public get citeproc (): CiteprocProvider { return this._citeprocProvider }
  public get config (): ConfigProvider { return this._configProvider }
  public get css (): CssProvider { return this._cssProvider }
  public get dictionary (): DictionaryProvider { return this._dictionaryProvider }
  public get links (): LinkProvider { return this._linkProvider }
  public get log (): LogProvider { return this._logProvider }
  public get menu (): MenuProvider { return this._menuProvider }
  public get notifications (): NotificationProvider { return this._notificationProvider }
  public get recentDocs (): RecentDocumentsProvider { return this._recentDocsProvider }
  public get stats (): StatsProvider { return this._statsProvider }
  public get tags (): TagProvider { return this._tagProvider }
  public get targets (): TargetProvider { return this._targetProvider }
  public get translations (): TranslationProvider { return this._translationProvider }
  public get tray (): TrayProvider { return this._trayProvider }
  public get updates (): UpdateProvider { return this._updateProvider }
  public get windows (): WindowProvider { return this._windowProvider }
  public get fsal (): FSAL { return this._fsal }
  public get documents (): DocumentManager { return this._documentManager }
  public get commands (): CommandProvider { return this._commandProvider }

  async shutdown (): Promise<void> {
    await this._safeShutdown(this._commandProvider)
    await this._safeShutdown(this._documentManager)
    await this._safeShutdown(this._fsal)

    await this._safeShutdown(this._windowProvider)
    await this._safeShutdown(this._trayProvider)
    await this._safeShutdown(this._statsProvider)
    await this._safeShutdown(this._notificationProvider)
    await this._safeShutdown(this._updateProvider)
    await this._safeShutdown(this._translationProvider)
    await this._safeShutdown(this._cssProvider)
    await this._safeShutdown(this._targetProvider)
    await this._safeShutdown(this._linkProvider)
    await this._safeShutdown(this._tagProvider)
    await this._safeShutdown(this._menuProvider)
    await this._safeShutdown(this._recentDocsProvider)
    await this._safeShutdown(this._dictionaryProvider)
    await this._safeShutdown(this._citeprocProvider)
    await this._safeShutdown(this._assetsProvider)
    await this._safeShutdown(this._appearanceProvider)
    await this._safeShutdown(this._configProvider)
    await this._safeShutdown(this._logProvider)
  }

  private async _safeShutdown <T extends ProviderContract> (provider: T): Promise<void> {
    try {
      await provider.shutdown()
    } catch (err: any) {
      this._logProvider.error(`[AppServiceContainer] Could not shut down provider ${provider.constructor.name}: ${err.message as string}`, err)
    }
  }
}
