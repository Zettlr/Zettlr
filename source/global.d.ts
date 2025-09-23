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
declare module '*.png' {
  const filePath: string
  export default filePath
}
declare module '*.svg' {
  const filePath: string
  export default filePath
}
declare module '*.mp3' {
  const filePath: string
  export default filePath
}
declare module '*.wav' {
  const filePath: string
  export default filePath
}

declare module 'vue-virtual-scroller'
declare module '@joplin/turndown'
declare module 'joplin-turndown-plugin-gfm'

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
declare const STATS_PRELOAD_WEBPACK_ENTRY: string
declare const STATS_WEBPACK_ENTRY: string
declare const TAG_MANAGER_PRELOAD_WEBPACK_ENTRY: string
declare const TAG_MANAGER_WEBPACK_ENTRY: string
declare const UPDATE_PRELOAD_WEBPACK_ENTRY: string
declare const UPDATE_WEBPACK_ENTRY: string
declare const PROJECT_PROPERTIES_PRELOAD_WEBPACK_ENTRY: string
declare const PROJECT_PROPERTIES_WEBPACK_ENTRY: string
declare const SPLASH_SCREEN_WEBPACK_ENTRY: string
declare const SPLASH_SCREEN_PRELOAD_WEBPACK_ENTRY: string
declare const ONBOARDING_WEBPACK_ENTRY: string
declare const ONBOARDING_PRELOAD_WEBPACK_ENTRY: string

// Contains the git build number and date
declare const __GIT_COMMIT_HASH__: string
declare const __BUILD_DATE__: string

/**
 * Declare and extend the global NodeJS object to enable the globals
 * for the service providers.
 *
 * NOTE: Most service providers define these interfaces in the corresponding
 * types files in ./source/app/service-providers/assets
 */
declare namespace global {
  // Translation data necessary to facilitate internationalisation
  var i18n: any
  var i18nRawData: any
  var i18nFallback: any
  var i18nFallbackRawData: any
}

declare interface Window {
  /**
   * The config API provides methods to read and set configuration values
   */
  config: {
    /**
     * Returns the config value associated with the provided key. If key is
     * undefined, returns the full configuration.
     *
     * @param   {string}  key  The key to retrieve
     *
     * @return  {any}          The value associated with key
     */
    get: (key?: string) => any
    /**
     * Sets the configuration value associated with key to value.
     *
     * @param   {string}  key    The key to set
     * @param   {any}     value  The value to set the key to
     */
    set: (key: string, value: any) => void
  }
  /**
   * Takes citation items and returns a rendered citation from main
   *
   * @param   {string}      database   The database to request from
   * @param   {CiteItem[]}  citations  The cite items (as CSL JSON)
   * @param   {boolean}     composite  Whether the citation is composite
   *
   * @return  {string|undefined}       The rendered citation, or undefined
   */
  getCitationCallback: (database: string) => (citations: CiteItem[], composite: boolean) => string|undefined
  ipc: {
    /**
     * Sends a message to main (fire-and-forget)
     *
     * @param   {string}  channel  The channel to send upon
     * @param   {any[]}   args     Arguments to provide
     *
     */
    send: (channel: string, ...args: any[]) => void
    /**
     * Sends a synchronous message and returns the response immediately.
     *
     * @param   {string}  event  The channel to send upon
     * @param   {any[]}   args   Arguments for that call
     *
     * @return  {any}             Whichever this call returns from main
     */
    sendSync: (event: string, ...args: any[]) => any
    /**
     * Sens a message to main and returns a promise which fulfills with the
     * response from main.
     *
     * @param   {string}        channel  The channel to send upon
     * @param   {any[]}         args     Arguments for that call
     *
     * @return  {Promise<any>}           Whichever this call returns from main
     */
    invoke: (channel: string, ...args: any[]) => Promise<any>
    /**
     * Listens to broadcasted messages from main
     *
     * @param   {string}     channel   The channel on which to listen
     * @param   {undefined}  listener  An event. This will always be omitted and undefined.
     * @param   {any}        args      Any payload that was sent from main
     *
     * @return {Function}  A function to stop listening (remove the listener)
     */
    on: (channel: string, listener: (event: undefined, ...args: any) => void) => () => void
  }
  /**
   * Returns the absolute path to the file on disk which this File object is
   * representing. Returns undefined if there was either an error or the File
   * object does not represent a file on disk.
   *
   * @param   {File}              file  The web File object
   *
   * @return  {string|undefined}        The absolute path, or undefined.
   */
  getPathForFile: (file: File) => string|undefined
}
