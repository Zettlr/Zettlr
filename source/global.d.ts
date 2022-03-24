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
declare module '*.mp3'
declare module '*.wav'

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
 * Declare and extend the global NodeJS object to enable the globals
 * for the service providers.
 *
 * NOTE: Most service providers define these interfaces in the corresponding
 * types files in ./source/app/service-providers/assets
 */
declare module global {
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
   * @param   {CiteItem[]}  items      The cite items (as CSL JSON)
   * @param   {boolean}     composite  Whether the citation is composite
   *
   * @return  {string|undefined}       The rendered citation, or undefined
   */
  getCitation: (items: CiteItem[], composite: boolean) => string|undefined
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
     */
    on: (channel: string, listener: (event: undefined, ...args: any) => void) => void
  }
  path: RendererPath
  clipboard: {
    /**
     * Returns whatever text is currently in the clipboard
     *
     * @return  {string}  The clipboard's plain text contents
     */
    readText: () => string
    /**
     * Returns whatever HTML is currently in the clipboard
     *
     * @return  {string}  The clipboard's HTML contents
     */
    readHTML: () => string
    /**
     * Returns whatever RTF is currently in the clipboard
     *
     * @return  {string}  The clipboard's RTF contents
     */
    readRTF: () => string
    /**
     * Is there currently image data in the clipboard?
     *
     * @return  {boolean}  True if the clipboard contains a non-empty image
     */
    hasImage: () => boolean
    /**
     * Returns the image data for the clipbord content
     *
     * @return {{ size: Electron.Size, aspect: number, dataUrl: string }} The image data
     */
    getImageData: () => { size: Electron.Size, aspect: number, dataUrl: string }
    /**
     * Writes the data into the clipboard
     *
     * @param {Electron.Data} data The data to be written to the clipboard
     */
    write: (data: Electron.Data) => void
    /**
     * Writes the given text into the clipboard
     *
     * @param   {string}  text  The text to put into the clipboard
     */
    writeText: (text: string) => void
    /**
     * Determines whether there is currently a selection clipboard (Linux)
     *
     * @return  {boolean}  True if there is a selection clipboard
     */
    hasSelectionClipboard: () => boolean
    /**
     * Returns the plain text and HTML contents of the selection clipboard on
     * linux.
     *
     * @return  {{text: string, html: string}}}  Returns an object containing HTML and text contents
     */
    getSelectionClipboard: () => { text: string, html: string }
  }
}

// This interface is being produced by the MarkdownEditor module in source/common
interface DocumentInfo {
  words: number
  chars: number
  chars_wo_spaces: number
  cursor: { ch: number, line: number }
  selections: Array<{
    selectionLength: number
    start: { ch: number, line: number }
    end: { ch: number, line: number }
  }>
}
