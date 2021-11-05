/* eslint-disable no-var */
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
declare module '*.svg'

/**
 * DECLARE ELECTRON-FORGE INSERTION VARIABLES
 *
 * These variables are set by electron-forge to point to the relevant entrypoints.
 */

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const ABOUT_PRELOAD_WEBPACK_ENTRY: string
declare const ABOUT_WEBPACK_ENTRY: string
declare const ASSETS_PRELOAD_WEBPACK_ENTRY: string
declare const ASSETS_WEBPACK_ENTRY: string
declare const ERROR_PRELOAD_WEBPACK_ENTRY: string
declare const ERROR_WEBPACK_ENTRY: string
declare const LOG_VIEWER_PRELOAD_WEBPACK_ENTRY: string
declare const LOG_VIEWER_WEBPACK_ENTRY: string
declare const PASTE_IMAGE_PRELOAD_WEBPACK_ENTRY: string
declare const PASTE_IMAGE_WEBPACK_ENTRY: string
declare const PREFERENCES_PRELOAD_WEBPACK_ENTRY: string
declare const PREFERENCES_WEBPACK_ENTRY: string
declare const PRINT_PRELOAD_WEBPACK_ENTRY: string
declare const PRINT_WEBPACK_ENTRY: string
declare const QUICKLOOK_PRELOAD_WEBPACK_ENTRY: string
declare const QUICKLOOK_WEBPACK_ENTRY: string
declare const STATS_PRELOAD_WEBPACK_ENTRY: string
declare const STATS_WEBPACK_ENTRY: string
declare const TAG_MANAGER_PRELOAD_WEBPACK_ENTRY: string
declare const TAG_MANAGER_WEBPACK_ENTRY: string
declare const UPDATE_PRELOAD_WEBPACK_ENTRY: string
declare const UPDATE_WEBPACK_ENTRY: string
declare const PROJECT_PROPERTIES_PRELOAD_WEBPACK_ENTRY: string
declare const PROJECT_PROPERTIES_WEBPACK_ENTRY: string

/**
 * DECLARE THE GLOBAL INTERFACES
 */
interface Application {
  runCommand: (command: string, payload?: any) => Promise<any>
  isQuitting: () => boolean
  showLogViewer: () => void
  showPreferences: () => void
  displayErrorMessage: (title: string, message: string, contents?: string) => void
  showAboutWindow: () => void
  showDefaultsPreferences: () => void
  showTagManager: () => void
  showAnyWindow: () => void
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
declare module global {
  var assets: AssetsProvider
  var css: CssProvider
  var dict: DictionaryProvider
  var log: LogProvider
  var store: any
  var notify: NotificationProvider
  var ipc: any
  var citeproc: CiteprocProvider
  var config: ConfigProvider
  var application: Application
  var typo: any
  var preBootLog: BootLog[]
  var tippy: any
  var updates: UpdateProvider
  var translations: any
  var targets: TargetProvider
  var tags: TagProvider
  var stats: StatsProvider
  var recentDocs: RecentDocumentsProvider
  // Translation data necessary to facilitate internationalisation
  var i18n: any
  var i18nRawData: any
  var i18nFallback: any
  var i18nFallbackRawData: any
  var tray: TrayProvider
  // This type is only required in the renderer processes since the
  // applicationMenuHelper is shared via the browser process's window object.
  var menuProvider: {
    show: (position: Point | Rect, items: AnyMenuItem[], callback: (clickedID: string) => void, cleanup?: boolean) => () => void
  }
}
