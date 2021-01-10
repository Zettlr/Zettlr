// We cannot have any imports or exports, as otherwise this file would not
// be read in by TypeScript as an ambient module declaration.
// More info: https://stackoverflow.com/a/35074833

/**
 * DECLARE THE GLOBAL INTERFACES
 */
interface Application {
  isBooting: () => boolean
  showLogViewer: () => void
  // TODO: Match the signatures of fileUpdate and dirUpdate
  fileUpdate: (oldHash: number, fileMetadata: any) => void
  dirUpdate: (oldHash: number, newHash: number) => void
  notifyChange: (msg: string) => void
  findFile: (prop: any) => MDFileDescriptor | CodeFileDescriptor | null
  findDir: (prop: any) => DirDescriptor | null
  // Same as findFile, only with content
  getFile: (fileDescriptor: MDFileDescriptor | CodeFileDescriptor) => Promise<MDFileMeta | CodeFileMeta>
}

interface LogProvider {
  verbose: (message: string, details?: any) => void
  info: (message: string, details?: any) => void
  warning: (message: string, details?: any) => void
  error: (message: string, details?: any) => void
}

interface CssProvider {
  on: (event, callback) => void
  off: (event, callback) => void
  get: () => string
  set: (newContent: string) => boolean
  getPath: () => string
}

interface ErrorNotification {
  title: string
  message: string
  additionalInfo: string
}

interface NotificationProvider {
  normal: (message: string, showInOS?: boolean) => void
  error: (error: ErrorNotification, showInOS?: boolean) => void
}

interface UpdateProvider {
  check: () => void // Initiates an update check programmatically
  applicationUpdateAvailable: () => boolean // True if an update is available
}

interface DictionaryProvider {
  on: (message: string, callback: Function) => void
  off: (message: string, callback: Function) => void
  getUserDictionary: () => string[]
  setUserDictionary: (dict: string[]) => void
}

interface RecentDocumentsProvider {
  add: (doc: MDFileDescriptor|CodeFileMeta) => void
  clear: () => void
  get: () => any[]
  hasDocs: () => boolean
  on: (message: string, callback: Function) => void
  off: (message: string, callback: Function) => void
}

// Dictionary in the form dic['yyyy-mm-dd'] = value
interface DailyDictionary {
  [day: string]: number
}

// Statistics object
interface Stats {
  wordCount: DailyDictionary // All words for the graph
  pomodoros: DailyDictionary // All pomodoros ever completed
  avgMonth: number // Monthly average
  today: number // Today's word count
  sumMonth: number // Overall sum for the past month
}

interface StatsProvider {
  increaseWordCount: (words: number) => void
  increasePomodoros: () => void
  getData: () => Stats
}

// Before the log provider has booted, these messages will be added to the
// preBootLog
interface BootLog {
  level: 1|2|3|4 // Taken from the LogLevel enum in the Log Provider
  message: string
  details?: any
}

interface WritingTarget {
  hash: number
  mode: 'words'|'chars'
  count: number
}

interface ColouredTag {
  name: string
  color: string
  desc: string
}

interface TagRecord {
  text: string
  count: number
  className: string
}

interface TagDatabase {
  [name: string]: TagRecord
}

interface TargetProvider {
  /**
   * Adds (or updates) a writing target to the database
   *
   * @param  {WritingTarget} target An object describing the new target.
   */
  set: (target: WritingTarget) => void
  /**
   * Returns a writing target
   *
   * @param  {number}                   hash  The hash to be searched for.
   * @return {WritingTarget|undefined}        The writing target.
   */
  get: (hash: number) => WritingTarget|undefined
  /**
   * Removes a target from the database and returns the operation status.
   *
   * @return {boolean} Whether or not the target was removed.
   */
  remove: (hash: number) => boolean
  /**
   * Adds callback to the event listeners
   *
   * @param  {String}   event    The event to be listened for.
   * @param  {Function} callback The callback when the event is emitted.
   */
  on: (event: string, callback: (...args: any[]) => void) => void
  /**
   * Removes an event listener
   *
   * @param  {String}   event    The event the listener was subscribed to
   * @param  {Function} callback The callback
   */
  off: (event: string, callback: (...args: any[]) => void) => void
  /**
   * Verifies the integrity of all callbacks
   */
  verify: () => void
}

interface TagProvider {
  /**
   * Adds an array of tags to the database
   *
   * @param  {string[]}  tagArray  An array containing the tags to be added
   */
  report: (tagArray: string[]) => void
  /**
   * Removes the given tagArray from the database, i.e. decreases the
   * counter until zero and then removes the tag.
   *
   * @param  {string[]}  tagArray  The tags to remove from the database
   */
  remove: (tagArray: string[]) => void
  /**
   * Returns the global tag database
   *
   * @return  {TagDatabase}  An object containing all tags.
   */
  getTagDatabase: () => TagDatabase
  /**
   * Returns special (= coloured) tags
   *
   * @return  {ColouredTag[]}  The list of coloured tags
   */
  getColouredTags: () => ColouredTag[]
  /**
   * Updates the special tags with an array of new ones.
   *
   * @param   {ColouredTag[]}  newTags  An array containing the tags to be set.
   */
  setColouredTags: (newTags: ColouredTag[]) => void
}

/**
 * Finally, declare and extend the global NodeJS object to enable the globals
 * for the service providers.
 */
declare module NodeJS {
  interface Global {
    css: CssProvider
    dict: DictionaryProvider
    log: LogProvider
    store: any
    notify: NotificationProvider
    ipc: any
    citeproc: any // CiteprocProvider
    config: any
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
  }
}

// Declare the bcp-47 module type definitions
interface Schema {
  language?: string
  extendedLanguageSubtags?: string
  script?: string
  region?: string
  variants?: string
  extensions?: any[]
  privateuse?: string[]
  regular?: 'art-lojban'|'cel-gaulish'|'no-bok'|'no-nyn'|'zh-guoyu'|'zh-hakka'|'zh-min'|'zh-min-nan'|'zh-xiang'
  irregular?: 'en-GB-oed'|'i-ami'|'i-bnn'|'i-default'|'i-enochian'|'i-hak'|'i-klingon'|'i-lux'|'i-mingo'|'i-navajo'|'i-pwn'|'i-tao'|'i-tay'|'i-tsu'|'sgn-BE-FR'|'sgn-BE-NL'|'sgn-CH-DE'
}

interface bcp47Options {
  normalize?: boolean
  forgiving?: boolean
  warning?: Function
}

declare module 'bcp-47' {
  export function parse (tag: string, options?: bcp47Options): Schema
}
