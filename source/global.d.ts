/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Global Typings
 * CVM-Role:        Types
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains global types for the main process's providers.
 *
 * END HEADER
 */

// We cannot have any imports or exports, as otherwise this file would not
// be read in by TypeScript as an ambient module declaration.
// More info: https://stackoverflow.com/a/35074833

/**
 * DECLARE ANY OTHER FILETYPES
 *
 * These filetypes can be "imported" but their resolved value will be a string
 * pointing to wherever the file-loader has put these files.
 */
declare module '*.png'

/**
 * DECLARE THE GLOBAL INTERFACES
 */
interface Application {
  runCommand: (command: string, payload?: any) => Promise<any>
  isQuiting: () => boolean
  showLogViewer: () => void
  showPreferences: () => void
  displayErrorMessage: (title: string, message: string, contents?: string) => void
  showAboutWindow: () => void
  showDefaultsPreferences: () => void
  showTagManager: () => void
  showAnyWindow: () => void
  notifyChange: (msg: string) => void
  findFile: (prop: any) => MDFileDescriptor | CodeFileDescriptor | null
  findDir: (prop: any) => DirDescriptor | null
  // Same as findFile, only with content
  getFile: (fileDescriptor: MDFileDescriptor | CodeFileDescriptor) => Promise<MDFileMeta | CodeFileMeta>
}

/**
 * Declare and extend the global NodeJS object to enable the globals
 * for the service providers.
 *
 * NOTE: Most service providers define these interfaces in the corresponding
 * types files in ./source/app/service-providers/assets
 */
declare module NodeJS {
  interface Global {
    assets: AssetsProvider
    css: CssProvider
    dict: DictionaryProvider
    log: LogProvider
    store: any
    notify: NotificationProvider
    ipc: any
    citeproc: CiteprocProvider
    config: ConfigProvider
    application: Application
    typo: any
    filesToOpen: string[]
    preBootLog: BootLog[]
    tippy: any
    updates: UpdateProvider
    translations: any
    targets: TargetProvider
    recentDocs: RecentDocumentsProvider
    tags: TagProvider
    stats: StatsProvider
    // Translation data necessary to facilitate internationalisation
    i18n: any
    i18nRawData: any
    i18nFallback: any
    i18nFallbackRawData: any
    tray: TrayProvider
  }
}
