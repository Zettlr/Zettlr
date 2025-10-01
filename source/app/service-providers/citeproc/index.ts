/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:    Citeproc Provider
 * CVM-Role:    Service Provider
 * Maintainer:  Hendrik Erz
 * License:     GNU GPL v3
 *
 * Description:     This class represents an interface between the citeproc-js
 *                  library, a Zotero generated BibLaTeX file (ideally in CSL
 *                  JSON), and your texts in Markdown.
 *
 * END HEADER
 */

import CSL from 'citeproc'
import { FSWatcher } from 'chokidar'
import { ipcMain } from 'electron'
import { promises as fs, readFileSync, constants as FS_CONSTANTS } from 'fs'
import path from 'path'
import { trans } from '@common/i18n-main'
import ProviderContract, { type IPCAPI } from '../provider-contract'
import type WindowProvider from '../windows'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { showNativeNotification } from '@common/util/show-notification'
import { loadDatabase } from './util/database-loader'

export interface DatabaseRecord {
  path: string
  // We basically have CSL databases (do not contain attachments) or BibTex
  // (contain attachments).
  type: 'csl'|'bibtex'|'biblatex'
  cslData: Record<string, CSLItem>
  bibtexAttachments: Record<string, string[]|false>
}

export type CiteprocProviderIPCAPI = IPCAPI<{
  'get-items': { database: string }
  'get-citation': { database: string, citations: CiteItem[], composite: boolean }
  'get-citation-sync': { database: string, citations: CiteItem[], composite: boolean }
  'get-bibliography': { database: string, citations: string[] }
}>

// The default style Zettlr ships with
const DEFAULT_CHICAGO_STYLE = path.join(__dirname, './assets/csl-styles/chicago-author-date.csl')

/**
 * This class enables to export citations from a CSL JSON file to HTML.
 */
export default class CiteprocProvider extends ProviderContract {
  /**
   * The main library which is being used everywhere where we don't have
   * specific libraries. This variable holds the absolute path.
   *
   * @var {string}
   */
  private mainLibrary: string

  /**
   * This property ensures we do not do double-work if a database should be
   * selected that has already been selected
   *
   * @var {string}
   */
  private lastSelectedDatabase: string

  /**
   * Our main citeproc engine. This may be enhanced in the future to hold more
   * engines, as each engine has one unique style.
   *
   * @var {CSL.Engine}
   */
  private engine: CSL.Engine
  /**
   * This array contains all available databases, including the main one.
   *
   * @var {DatabaseRecord[]}
   */
  private readonly databases: Map<string, DatabaseRecord>

  /**
   * This hashmap contains a mapping of citekeys --> CSLItems for quick access
   * by the CSL engine.
   *
   * @var {Object}
   */
  private _items: Record<string, CSLItem>

  /**
   * Just like the FSAL, the citeproc provider maintains a watcher for citation
   * files. If they change, or are unlinked, the provider can react to them.
   *
   * @var {FSWatcher}
   */
  private readonly _watcher: FSWatcher

  /**
   * This is the kernel that is being used by the CSL engine to retrieve both
   * CSL items and a locale file.
   *
   * @var {CSLKernel}
   */
  private readonly sys: CSLKernel

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _windows: WindowProvider
  ) {
    super()

    this._items = {}
    this.lastSelectedDatabase = ''
    this.mainLibrary = ''

    // Start the watcher
    this._watcher = new FSWatcher({
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
      // See for the following property the file source/main/modules/fsal/fsal-watchdog.ts
      interval: 5000,
      // Databases can become quite large, so we have to wait for it to finish
      awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
      }
    })

    this._watcher.on('all', (eventName, affectedPath) => {
      const db = this.databases.get(affectedPath)

      if (db === undefined && eventName === 'change') {
        this._logger.info(`[Citeproc] Retrying to load ${affectedPath} ...`)
        // This indicates that the library had been loaded, but threw an error
        // on reload (happens frequently, e.g., with Zotero). In that case,
        // simply load it.
        this.loadDatabase(affectedPath, false)
          .catch(err => { this._logger.error(`[Citeproc] Could not reload database ${affectedPath}: ${String(err.message)}`, err) })
      } else if (db === undefined) {
        this._logger.warning(`[Citeproc] Received an event ${eventName} for path ${affectedPath}: Could not handle.`)
      } else if (eventName === 'change') {
        this._logger.info(`[Citeproc] Changes detected for ${affectedPath}. Reloading ...`)
        // NOTE: We have to ask the engine to not unwatch the database.
        // Sometimes, errors may be, and if we unwatch the database on change
        // events, this would lead any error to no more changes being detected.
        // And an error can be as simple as "the program was not finished
        // writing the changes to disk." (looking at you, BetterBibTex :P)
        this.unloadDatabase(affectedPath, false)
        this.loadDatabase(affectedPath, false)
          .then(() => broadcastIpcMessage('citeproc-database-updated', affectedPath))
          .catch(err => { this._logger.error(`[Citeproc Provider] Error while reloading database ${affectedPath}: ${String(err.message)}`, err) })
      } else if (eventName === 'unlink') {
        this.unloadDatabase(affectedPath)
        broadcastIpcMessage('citeproc-database-updated', affectedPath)
      }
    })

    this.databases = new Map() // Holds all currently loaded databases

    // The sys kernel is required by the citeproc processor
    this.sys = {
      retrieveLocale: (lang: string) => {
        return this.getLocale(lang)
      },
      retrieveItem: (id: string) => {
        return this._items[id]
      }
    }

    // Be notified of potential updates
    this._config.on('update', (option: string) => {
      this.onConfigUpdate(option)
    })

    /**
     * Listen for events coming from the citation renderer of the MarkdownEditor
     */
    ipcMain.on('citeproc-provider', (event, message: CiteprocProviderIPCAPI) => {
      const { command, payload } = message
      if (command === 'get-citation-sync') {
        const { database, citations, composite } = payload
        event.returnValue = this.getCitation(database, citations, composite)
      }
    })

    /**
     * Listen to renderer requests
     */
    ipcMain.handle('citeproc-provider', async (event, message: CiteprocProviderIPCAPI) => {
      const { command, payload } = message
      const { database } = payload
      // Ensure the database is loaded in any case (will throw a visible error
      // if the database cannot be loaded)
      try {
        await this.loadDatabase(database)
      } catch (err: any) {
        this._logger.error(`[Citeproc Provider] Could not load database ${String(database)}: ${err.message as string}`, err)
        // Proper early return based on the command
        return command === 'get-items' ? [] : undefined
      }

      if (command === 'get-items') {
        const dbPath = database === CITEPROC_MAIN_DB ? this.mainLibrary : database
        const db = this.databases.get(dbPath)
        if (db === undefined) {
          return []
        } else {
          return Object.values(db.cslData)
        }
      } else if (command === 'get-citation') {
        const { citations, composite } = payload
        return this.getCitation(database, citations, composite)
      } else if (command === 'get-bibliography') {
        const { citations } = payload
        // The Payload contains the items the renderer wants to have
        return this.makeBibliography(database, citations)
      }
    })
  } // END constructor

  public hasBibTexAttachments (dbPath: string): boolean {
    const db = this.databases.get(dbPath)
    if (db === undefined) {
      return false
    }

    return Object.keys(db.bibtexAttachments).length > 0
  }

  public getBibTexAttachments (dbPath: string, id: string): string[]|false {
    const db = this.databases.get(dbPath)
    if (db === undefined) {
      return false
    }

    return db.bibtexAttachments[id] ?? false
  }

  public async boot (): Promise<void> {
    this._logger.verbose('Citeproc provider booting up ...')
    this.mainLibrary = this._config.get().export.cslLibrary

    await this.loadEngine()

    if (this.mainLibrary === '') {
      return
    }

    try {
      await this.loadDatabase(this.mainLibrary)
    } catch (err: any) {
      const msg = String(err.message)
      this._logger.error(`[Citeproc Provider] Could not load main library: ${msg}`, err)
      this._windows.showErrorMessage(trans('The citation database could not be loaded'), msg, msg)
    }
  }

  /**
   * Use this function to direct the provider to keep the provided databases
   * available. The provider will unload any database that is currently
   * available, but not present in the dbPaths array.
   *
   * @param  {string[]}  dbPaths  The absolute paths to the libraries
   */
  public async synchronizeDatabases (dbPaths: string[]): Promise<void> {
    // First load databases that are not yet available
    for (const dbPath of dbPaths) {
      if (!this.databases.has(dbPath)) {
        await this.loadDatabase(dbPath)
        broadcastIpcMessage('citeproc-database-updated', dbPath)
      }
    }
    // Second unload databases no longer required
    for (const dbPath of this.databases.keys()) {
      if (dbPath === this.mainLibrary) {
        continue // Do not unload the (fallback) main database
      }
      if (!dbPaths.includes(dbPath)) {
        this.unloadDatabase(dbPath)
        broadcastIpcMessage('citeproc-database-updated', dbPath)
      }
    }
  }

  /**
   * Loads a new engine. TODO: We can use this to create multiple engines with
   * different CSL Styles loaded.
   *
   * @return {CSL.Engine} The instantiated engine
   */
  private async loadEngine (): Promise<void> {
    const style = await fs.readFile(DEFAULT_CHICAGO_STYLE, 'utf-8')

    // The last parameter enforces usage of the language we provide
    this.engine = new CSL.Engine(this.sys, style, this._config.get().appLang, true)
    // ATTENTION: This is a development extension we're using to auto-wrap
    // links and DOIs in a-tags so that the user can click them in the
    // bibliography. Remove if it becomes unstable and implement manually.
    this.engine.opt.development_extensions.wrap_url_and_doi = true
  }

  /**
   * This function loads a full citation database and returns it
   *
   * @param   {string}                   databasePath  The path to load the database from
   *
   * @return  {Promise<DatabaseRecord>}                Resolves with the DatabaseRecord
   */
  private async loadDatabase (databasePath: string, watch = true): Promise<void> {
    if (databasePath === CITEPROC_MAIN_DB && !this.hasMainLibrary()) {
      this._logger.verbose('[Citeproc Provider] Could not load main database: No main database available.')
      return
    } else if (databasePath === CITEPROC_MAIN_DB) {
      databasePath = this.mainLibrary
    }

    if (this.databases.has(databasePath)) {
      return // No need to load the database again
    }

    try {
      await fs.access(databasePath, FS_CONSTANTS.F_OK|FS_CONSTANTS.R_OK)
    } catch (err) {
      throw new Error(`File "${databasePath}" does not exist or is not visible to the app.`)
    }

    const record = await loadDatabase(databasePath, this._logger)

    // Add the database to the list of available databases
    this.databases.set(databasePath, record)

    // Now that the database has been successfully loaded, watch it for changes.
    if (watch) {
      this._watcher.add(databasePath)
    }
    broadcastIpcMessage('citeproc-database-updated', databasePath)
  }

  /**
   * Unloads a database
   *
   * @param   {string}  dbPath  The database file path
   */
  private unloadDatabase (dbPath: string, unwatch = true): void {
    if (this.databases.has(dbPath)) {
      this._logger.info(`[Citeproc Provider] Unloading database ${dbPath}`)

      if (unwatch) {
        this._watcher.unwatch(dbPath)
      }

      this.databases.delete(dbPath)
      broadcastIpcMessage('citeproc-database-updated', dbPath)
    }
  }

  /**
   * Selects another database and activates it.
   *
   * @param   {string}  dbPath  The database to select
   */
  private selectDatabase (dbPath: string): void {
    if (dbPath === CITEPROC_MAIN_DB) {
      dbPath = this.mainLibrary // No specific database requested
    }

    const database = this.databases.get(dbPath)

    if (database === undefined) {
      throw new Error(`Could not select database ${dbPath}: Not loaded.`)
    }

    if (this.lastSelectedDatabase !== dbPath) {
      this._logger.verbose(`[Citeproc Provider] Selecting database ${dbPath}...`)
    }

    this._items = database.cslData

    // Remove the items from the registry
    this.engine.updateItems([])
    this.lastSelectedDatabase = dbPath
  }

  /**
   * Shuts down the service provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Citeproc provider shutting down ...')
    // We MUST under all circumstances properly call the close() function on
    // every chokidar process we utilize. Otherwise, the fsevents dylib will
    // still hold on to some memory after the Electron process itself shuts down
    // which will result in a crash report appearing on macOS.
    await this._watcher.close()
  }

  /**
   * There has been a config update. In case the main library has changed, reload
   */
  onConfigUpdate (option: string): void {
    if (option === 'appLang') {
      // We have to reload the engine to reflect the new language
      this.loadEngine().catch(err => this._logger.error(`[Citeproc Provider] Could not reload engine: ${err.message}`, err))
    } else if (option === 'export.cslLibrary') {
      // Determine if we have to reload
      const newValue = this._config.get('export.cslLibrary')

      if (newValue !== this.mainLibrary) {
        showNativeNotification(trans('Changes to the library file detected. Reloading …'))
        this.unloadDatabase(this.mainLibrary)
        broadcastIpcMessage('citeproc-database-updated', CITEPROC_MAIN_DB)
        this.mainLibrary = newValue
        if (this.mainLibrary.trim() === '') {
          return // The user removed the csl library
        }

        this.loadDatabase(this.mainLibrary)
          .then(() => broadcastIpcMessage('citeproc-database-updated', CITEPROC_MAIN_DB))
          .catch(err => {
            const msg = String(err.message)
            this._logger.error(`[Citeproc Provider] Could not reload main library: ${msg}`, err)
            this._windows.showErrorMessage(trans('The citation database could not be loaded'), msg)
          })
      }
    }
  }

  /**
   * Reads in a language XML file and returns either its contents, or false (in
   * which case the engine will fall back some times until it ends with en-US)
   *
   * @param   {string}          lang  The language to be loaded.
   * @return  {string|boolean}        Either the contents of the XML file, or false.
   */
  private getLocale (lang: string): string|false {
    // Takes a lang in the format xx-XX and has to return the corresponding XML
    // file. Let's do just that!

    if (lang === 'us') {
      // From the docs: "The function _must_ return a value for the us locale."
      // See https://citeproc-js.readthedocs.io/en/latest/running.html#retrievelocale
      lang = 'en-US'
    }

    try {
      const localePath = path.join(__dirname, `./assets/csl-locales/locales-${lang}.xml`)
      this._logger.info(`[Citeproc Provider] Loading CSL locale file at ${localePath} ...`)
      // NOTE that this System function must be synchronous, so we cannot use
      // the asynchronous promises API here.
      return readFileSync(localePath, { encoding: 'utf8' })
    } catch (err) {
      // File not found -> Let the engine fall back to a default.
      return false
    }
  }

  /**
   * PUBLIC FUNCTIONS
   */

  /**
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   *
   * @param  {string}            database   The database in which to search
   * @param  {CiteItem[]}        citations  Array containing the IDs to be returned
   * @param  {boolean}           composite  If true, getCitation will mimic the "mode: composite" feature of processCitationCluster
   *
   * @return {string|undefined}             The rendered string
   */
  getCitation (database: string, citations: CiteItem[], composite: boolean = false): string|undefined {
    if (citations.length === 0) {
      return undefined // Nothing to render
    }

    if (database === CITEPROC_MAIN_DB && !this.hasMainLibrary()) {
      return undefined
    }

    try {
      // Make sure we have the correct database loaded
      this.selectDatabase(database)
      const citekeys = citations.map(c => c.id)
      if (!this.ensureCitekeysExist(citekeys)) {
        this._logger.verbose(`[CiteprocProvider] Cannot render citation with citekeys ${citekeys.join(', ')}: At least one key does not exist in database ${database}`)
        return undefined
      }

      if (!composite || citations.length > 1) {
        return this.engine.makeCitationCluster(citations)
      } else if (composite && citations.length === 1) {
        // Mimic the composite mode
        const citation = citations[0]
        const suffix = citation.suffix
        citation.suffix = undefined
        citation['author-only'] = true
        citation['suppress-author'] = false
        const author = this.engine.makeCitationCluster([citation])
        citation.suffix = suffix
        citation['author-only'] = false
        citation['suppress-author'] = true
        const rest = this.engine.makeCitationCluster([citation])
        return author + ' ' + rest
      }
    } catch (err: any) {
      const msg = citations.map(elem => elem.id).join(', ')
      this._logger.error(`[citeproc] makeCitationCluster: Could not create citation cluster ${msg}: ${String(err)}`, err)
      return undefined
    }
  }

  /**
   * Directs the engine to create a bibliography from the items currently in the
   * registry (this can be updated by calling updateItems with an array of IDs.)
   *
   * @param  {string}    database  The database to use for creating the bibliography
   * @param  {string[]}  citekeys  The citekeys to use for creating the bibliography
   *
   * @return {[BibliographyOptions, string[]]|undefined} A CSL object containing the bibliography.
   */
  makeBibliography (database: string, citekeys: string[]): [BibliographyOptions, string[]]|undefined {
    if (citekeys.length === 0) {
      return undefined
    }

    if (database === CITEPROC_MAIN_DB && !this.hasMainLibrary()) {
      return undefined
    }

    try {
      this.selectDatabase(database)
      const sanitizedCitekeys = this.filterNonExistingCitekeys(citekeys)
      this.engine.updateItems(sanitizedCitekeys)
      return this.engine.makeBibliography()
    } catch (err: any) {
      this._logger.error(`[citeproc] makeBibliography: Could not create bibliography: ${String(err)}`, err)
      return undefined // Something went wrong (e.g. falsy items in the registry)
    }
  }

  /**
   * Checks whether a main library is available
   *
   * @return  {boolean} True if there is
   */
  private hasMainLibrary (): boolean {
    return this.mainLibrary !== '' && this.databases.has(this.mainLibrary)
  }

  /**
   * This function returns false if at least one provided citekey does not exist
   * in the currently selected database. Can be called after selecting a
   * database to ensure the CSLEngine does not throw errors if a key does not
   * exist.
   *
   * @param   {string[]}  citekeys  The citekeys to check
   *
   * @return  {boolean}             Returns false if one or more citekeys don't
   *                                exist in the selected database.
   */
  private ensureCitekeysExist (citekeys: string[]): boolean {
    for (const key of citekeys) {
      if (!(key in this._items)) {
        return false
      }
    }

    return true
  }

  /**
   * In instances where a few undefined citekeys are allowed, such as generating
   * the bibliography, this function simply removes those that don't exist
   * instead of requiring all of them to exist.
   *
   * @param   {string[][]}  citekeys  The unfiltered citekeys
   *
   * @return  {string[]}              The list of keys that exist in the database
   */
  private filterNonExistingCitekeys (citekeys: string[]): string[] {
    return citekeys.filter(key => key in this._items)
  }
}
