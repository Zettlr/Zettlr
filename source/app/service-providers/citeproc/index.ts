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
import { promises as fs, readFileSync } from 'fs'
import path from 'path'
import { trans } from '@common/i18n-main'
import extractBibTexAttachments from './extract-bibtex-attachments'
import { parse as parseBibTex } from 'astrocite-bibtex'
import YAML from 'yaml'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract from '../provider-contract'
import NotificationProvider from '../notifications'
import WindowProvider from '../windows'
import LogProvider from '../log'

interface DatabaseRecord {
  path: string
  // We basically have CSL databases (do not contain attachments) or BibTex
  // (contain attachments).
  type: 'csl'|'bibtex'
  cslData: CSLItem[]
  bibtexAttachments: {
    [citeKey: string]: string
  }
}

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
  private _mainLibrary: string
  /**
   * Our main citeproc engine. This may be enhanced in the future to hold more
   * engines, as each engine has one unique style.
   *
   * @var {CSL.Engine}
   */
  private _engine: CSL.Engine
  /**
   * This array contains all currently loaded databases.
   *
   * @var {DatabaseRecord[]}
   */
  private readonly _databases: DatabaseRecord[]
  /**
   * An integer that points to the index of the database that is currently
   * active (only one database can be active at a time). If this variable is
   * -1, this means no database is selected.
   *
   * @var {number}
   */
  private _databaseIdx: number

  /**
   * This hashmap contains a mapping of citekeys --> CSLItems for quick acces
   * by the CSL engine.
   *
   * @var {Object}
   */
  private _items: {
    [citekey: string]: CSLItem
  }

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
  private readonly _sys: CSLKernel

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _notifications: NotificationProvider,
    private readonly _windows: WindowProvider
  ) {
    super()

    this._logger.verbose('Citeproc provider booting up ...')
    const style = path.join(__dirname, './assets/csl-styles/chicago-author-date.csl')
    this._items = Object.create(null) // ID-accessible CSL data array.
    this._mainLibrary = this._config.get('export.cslLibrary')

    // Start the watcher
    this._watcher = new FSWatcher({
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
      // See for the following property the file source/main/modules/fsal/fsal-watchdog.ts
      interval: 5000
    })

    this._watcher.on('all', (eventName, affectedPath) => {
      const db = this._databases.find(db => db.path === affectedPath)

      if (db === undefined) {
        this._logger.warning(`[Citeproc Provider] Chokidar reported the event ${eventName}:${affectedPath}, but no such database was loaded`)
        return
      }

      if (eventName === 'change') {
        this._logger.info(`[Citeproc Provider] Database ${affectedPath} has been changed remotely. Reloading ...`)
        const isSelected = this._databases.indexOf(db) === this._databaseIdx
        this._unloadDatabase(affectedPath)
        this._loadDatabase(affectedPath)
          .then(db => {
            if (isSelected) {
              // Reselect
              this._selectDatabase(affectedPath)
            }
          })
          .catch(err => {
            if (err.message === 'Unexpected end of JSON input') {
              // This error message indicates that the database hasn't yet been
              // fully written. This happens often with large databases
              // containing several thousand elements. So in this case we
              // schedule a reload for in 5 seconds from now, since then it
              // should be written successfully.
              this._logger.warning(`[Citeproc Provider] Reloading ${affectedPath} failed, but the error indicated it needs more time to finish writing. Attempting again in 5 seconds. If this happens often, try to reduce the size of the database file.`)
              setTimeout(() => {
                this._loadDatabase(affectedPath)
                  .then(db => {
                    if (isSelected) {
                      // Reselect
                      this._selectDatabase(affectedPath)
                    }
                  })
                  .catch(err => {
                    this._logger.error(`[Citeproc Provider] Could not reload database ${affectedPath} after second attempt: ${String(err.message)}`, err)
                  })
              }, 5000)
            } else {
              this._logger.error(`[Citeproc Provider] Could not reload affected database ${affectedPath}: ${String(err.message)}`, err)
            }
          })
      } else if (eventName === 'unlink') {
        this._logger.warning(`[Citeproc Provider] Database ${affectedPath} has been removed remotely. Unloading from processor ...`)
        this._unloadDatabase(affectedPath)
      }
    })

    this._databases = [] // Holds all currently loaded databases
    this._databaseIdx = -1 // The index of the active database

    // The sys kernel is required by the citeproc processor
    this._sys = {
      retrieveLocale: (lang: string) => {
        return this._getLocale(lang)
      },
      retrieveItem: (id: string) => {
        return this._items[id]
      }
    }

    this._engine = this._makeEngine(style) // Holds the CSL engine

    // Be notified of potential updates
    this._config.on('update', (option: string) => {
      this._onConfigUpdate(option)
    })

    /**
     * Listen for events coming from the citation renderer of the MarkdownEditor
     */
    ipcMain.on('citation-renderer', (event, content) => {
      const { command, payload } = content

      if (command === 'get-citation-sync') {
        event.returnValue = this.getCitation(payload.citations, payload.composite)
      }
    })

    /**
     * Listen to renderer requests
     */
    ipcMain.handle('citeproc-provider', (event, message) => {
      const { command } = message
      if (command === 'get-items') {
        if (!this.isReady()) {
          return []
        } else {
          return this._databases[this._databaseIdx].cslData
        }
      } else if (command === 'get-citation') {
        return this.getCitation(message.payload.citations, message.payload.composite)
      } else if (command === 'get-bibliography') {
        // The Payload contains the items the renderer wants to have
        this.updateItems(message.payload)
        return this.makeBibliography()
      }
    })
  } // END constructor

  hasBibTexAttachments (): boolean {
    if (this._databaseIdx < 0) {
      return false
    }

    const db = this._databases[this._databaseIdx]
    return Object.keys(db.bibtexAttachments).length > 0
  }

  getBibTexAttachments (id: string): string|undefined {
    return this._databases[this._databaseIdx].bibtexAttachments[id]
  }

  loadMainDatabase (): void {
    // Make sure we deselect the current one, in case there is no main library
    // defined so that the library will be effectively empty afterwards.
    this._deselectDatabase()
    if (this._databases.find((db) => db.path === this._mainLibrary) !== undefined) {
      this._selectDatabase(this._mainLibrary)
    }
  }

  async loadAndSelect (database: string): Promise<void> {
    let db = this._databases.find((db) => db.path === database)

    if (db === undefined) {
      db = await this._loadDatabase(database)
    }

    this._selectDatabase(db.path)
  }

  getSelectedDatabase (): string|undefined {
    if (this._databaseIdx > -1) {
      return this._databases[this._databaseIdx].path
    }
  }

  public async boot (): Promise<void> {
    if (this._mainLibrary.trim() !== '') {
      try {
        const db = await this._loadDatabase(this._mainLibrary)
        this._selectDatabase(db.path)
      } catch (err: any) {
        this._logger.error(`[Citeproc Provider] Could not load main library: ${String(err.message)}`, err)
        this._windows.showErrorMessage(trans('gui.citeproc.error_db'), err.message, err.message)
      }
    }
  }

  /**
   * Loads a new engine. TODO: We can use this to create multiple engines with
   * different CSL Styles loaded.
   *
   * @return {CSL.Engine} The instantiated engine
   */
  _makeEngine (stylePath: string, lang?: string): CSL.Engine {
    const style = readFileSync(stylePath, { encoding: 'utf8' })

    if (lang === undefined) {
      lang = this._config.get('appLang')
    }

    const engine = new CSL.Engine(
      this._sys, // Pass the kernel config
      style,
      lang,
      true // Make sure it uses the application language, not the default (en-US)
    )
    // ATTENTION: This is a development extension we're using to auto-wrap
    // links and DOIs in a-tags so that the user can click them in the
    // bibliography. Remove if it becomes unstable and implement manually.
    engine.opt.development_extensions.wrap_url_and_doi = true

    return engine
  }

  /**
   * This function loads a full citation database and returns it
   *
   * @param   {string}                   databasePath  The path to load the database from
   *
   * @return  {Promise<DatabaseRecord>}                Resolves with the DatabaseRecord
   */
  async _loadDatabase (databasePath: string): Promise<DatabaseRecord> {
    const record: DatabaseRecord = {
      path: databasePath,
      type: 'csl',
      cslData: [],
      bibtexAttachments: Object.create(null)
    }

    // Prepare some helper variables
    const libraryType = path.extname(databasePath).toLowerCase()

    // First read in the database file
    const data = await fs.readFile(databasePath, 'utf8')

    if (libraryType === '.json') {
      // Parse as JSON
      this._logger.info(`[Citeproc Provider] Parsing file ${databasePath} as CSL JSON ...`)
      record.cslData = JSON.parse(data)
    } else if ([ '.yaml', '.yml' ].includes(libraryType)) {
      // Parse as YAML
      this._logger.info(`[Citeproc Provider] Parsing file ${databasePath} as CSL YAML ...`)
      const yamlData = YAML.parse(data)
      if ('references' in yamlData) {
        record.cslData = yamlData.references // CSL YAML is stored in references
      } else if (Array.isArray(yamlData)) {
        record.cslData = yamlData // It may be that it's simply an array of entries
      } else {
        throw new Error('The CSL YAML file did not contain valid contents.')
      }
    } else if (libraryType === '.bib') {
      // Parse as BibTex
      this._logger.info(`[Citeproc Provider] Parsing file ${databasePath} as BibTex ...`)
      record.cslData = parseBibTex(data)
      record.type = 'bibtex'

      // If we're here, we had a BibTex library --> extract the attachments
      let attachments = extractBibTexAttachments(data, path.dirname(databasePath))
      record.bibtexAttachments = attachments as any
    } else {
      throw new Error('Could not read database: Unknown file type')
    }

    this._logger.info(`[Citeproc Provider] Database ${record.path} loaded (${record.cslData.length} items).`)

    // Add the database to the list of available databases
    this._databases.push(record)

    // Now that the database has been successfully loaded, watch it for changes.
    this._watcher.add(databasePath)

    return record
  }

  /**
   * Unloads a database
   *
   * @param   {string}  dbPath  The database file path
   */
  _unloadDatabase (dbPath: string): void {
    const idx = this._databases.findIndex(db => db.path === dbPath)
    if (idx < 0) {
      throw new Error('Cannot unload database: Index out of range.')
    }

    if (idx === this._databaseIdx) {
      this._deselectDatabase()
    }

    const db = this._databases[idx]
    this._watcher.unwatch(db.path)
    this._databases.splice(idx, 1)
  }

  /**
   * Selects another database and activates it.
   *
   * @param   {string}  dbPath  The database to select
   */
  _selectDatabase (dbPath: string): void {
    // Find the database
    const database = this._databases.find((db) => db.path === dbPath)

    if (database === undefined) {
      throw new Error(`Could not select database ${dbPath}: Not loaded.`)
    }

    // First we need to reorder the read data so that it can be passed to the
    // sys object
    for (let i = 0; i < database.cslData.length; i++) {
      const item = database.cslData[i]
      const id = item.id
      this._items[id] = item
    }

    // Set the database index
    this._databaseIdx = this._databases.indexOf(database)

    // Remove the items from the registry
    this._engine.updateItems([])

    // Notify everyone interested
    broadcastIpcMessage('citeproc-provider', 'database-changed')
  }

  /**
   * Unloads the current database so that none is loaded.
   *
   */
  _deselectDatabase (): void {
    // We are unloading the current database
    this._items = Object.create(null)
    this._engine.updateItems([]) // Remove the items from the registry
    this._databaseIdx = -1
    // Notify everyone interested
    broadcastIpcMessage('citeproc-provider', 'database-changed')
  }

  /**
   * Shuts down the service provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Citeproc provider shutting down ...')
    await this._watcher.close()
  }

  /**
   * There has been a config update. In case the main library has changed, reload
   */
  _onConfigUpdate (option: string): void {
    if (option === 'appLang') {
      // We have to reload the engine to reflect the new language
      this._engine = this._makeEngine(path.join(__dirname, './assets/csl-styles/chicago-author-date.csl'))
    }

    if (option === 'export.cslLibrary') {
      // Determine if we have to reload
      const hasChanged = this._config.get('export.cslLibrary') !== this._mainLibrary

      if (hasChanged) {
        this._notifications.show(trans('gui.citeproc.reloading'))
        try {
          this._unloadDatabase(this._mainLibrary)
        } catch (err) {
          // The main library has not been loaded, proceed.
          // TODO: Race condition: If the config update comes early in the
          // application boot process, we might end up with two times the same
          // database.
          this._logger.info('[Citeproc Provider] Not unloading main library.')
        }
        this._mainLibrary = this._config.get('export.cslLibrary')
        if (this._mainLibrary.trim() === '') {
          return // The user removed the csl library
        }

        this._loadDatabase(this._mainLibrary)
          .then(db => {
            this._selectDatabase(db.path)
          })
          .catch(err => {
            this._logger.error(`[Citeproc Provider] Could not reload main library: ${String(err.message)}`, err)
            this._windows.showErrorMessage(trans('gui.citeproc.error_db'), err.message)
          })
      }
    }
  }

  /**
   * Reads in a language XML file and returns either its contents, or false (in
   * which case the engine will fall back some times until it ends with en-US)
   * @param  {string} lang The language to be loaded.
   * @return {string|boolean}  Either the contents of the XML file, or false.
   */
  _getLocale (lang: string): string|boolean {
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
   * @param  {CiteItem[]}        citations  Array containing the IDs to be returned
   * @param  {boolean}           composite  If true, getCitation will mimick the "mode: composite" feature of processCitationCluster
   *
   * @return {string|undefined}             The rendered string
   */
  getCitation (citations: CiteItem[], composite = false): string|undefined {
    if (!this.isReady()) {
      return undefined
    }

    if (citations.length === 0) {
      return undefined // Nothing to render
    }

    try {
      if (!composite || citations.length > 1) {
        return this._engine.makeCitationCluster(citations)
      } else if (composite && citations.length === 1) {
        // Mimick the composite mode
        const citation = citations[0]
        citation['author-only'] = true
        citation['suppress-author'] = false
        const author = this._engine.makeCitationCluster([citation])
        citation['author-only'] = false
        citation['suppress-author'] = true
        const rest = this._engine.makeCitationCluster([citation])
        return author + ' ' + rest
      }
    } catch (err: any) {
      const msg = citations.map(elem => elem.id).join(', ')
      this._logger.error(`[citeproc] makeCitationCluster: Could not create citation cluster ${msg}: ${String(err)}`, err)
      return undefined
    }
  }

  /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   *
   * @param  {string[]} citations A list of IDs
   * @return {boolean}            True if the registry has been updated correctly.
   */
  updateItems (citations: string[]): boolean {
    try {
      // Don't try to pass non-existent items in there, since that will make
      // the citeproc engine to throw an error.
      const sanitizedCitations = citations.filter(id => {
        return this._sys.retrieveItem(id) !== undefined
      })
      this._engine.updateItems(sanitizedCitations)
      return true
    } catch (err: any) {
      this._logger.error('[citeproc] Could not update engine registry: ' + String(err.message), citations)
      return false
    }
  }

  /**
   * Directs the engine to create a bibliography from the items currently in the
   * registry (this can be updated by calling updateItems with an array of IDs.)
   *
   * @return {[BibliographyOptions, string[]]|undefined} A CSL object containing the bibliography.
   */
  makeBibliography (): [BibliographyOptions, string[]]|undefined {
    if (!this.isReady()) {
      return undefined
    }

    try {
      return this._engine.makeBibliography()
    } catch (err: any) {
      this._logger.warning(err.message, err)
      return undefined // Something went wrong (e.g. falsy items in the registry)
    }
  }

  /**
   * Can be used to queue whether or not the engine is ready
   * @return {Boolean} The status of the engine
   */
  isReady (): boolean {
    const hasDatabases = this._databases.length > 0
    const hasItems = Object.keys(this._items).length > 0
    return hasDatabases && hasItems
  }
}
