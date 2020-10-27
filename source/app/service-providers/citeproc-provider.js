/* global */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:    ZettlrCiteproc
 * CVM-Role:    Model
 * Maintainer:  Hendrik Erz
 * License:     GNU GPL v3
 *
 * Description:     This class represents an interface between the citeproc-js
 *      library, a Zotero generated BibLaTeX file (ideally in CSL
 *      JSON) and your texts in Markdown. This class is therefore
 *      conceptualised as a model, because it models a whole
 *      database.
 *
 * END HEADER
 */

const citeproc = require('citeproc')
const chokidar = require('chokidar') // We'll just use the one-liner to watch the library file.
const { ipcMain } = require('electron')
const Citr = require('@zettlr/citr') // Parse the citations from the renderer
const fs = require('fs')
const path = require('path')
const { trans } = require('../../common/lang/i18n')
const extractBibTexAttachments = require('../../common/util/extract-bibtex-attachments')
const BibTexParser = require('astrocite-bibtex')

// Statuses the engine can be in
const NOT_LOADED = 0
const BOOTING = 1
const NO_DB = 2
const ERROR = 3
const READY = 4

/**
 * This class enables to export citations from a CSL JSON file to HTML.
 */
module.exports = class CiteprocProvider {
  constructor () {
    global.log.verbose('Citeproc provider booting up ...')
    this._mainLibrary = ''
    // The Zettlr internal preview of these citations will always use Chicago,
    // because (a) it's just a preview, and (b) Chicago is the default of Pandoc.
    this._lang = global.config.get('appLang')
    this._mainStyle = require('./assets/csl-styles/chicago-author-date.csl')
    this._engine = null // Holds the CSL engine
    this._cslData = null // Holds the parsed CSL data (JSON)
    this._bibtexAttachments = null // Holds the bibtex-attachments, if applicable
    this._items = {} // ID-accessible CSL data array.
    this._ids = Object.create(null) // Database index array
    this._idHint = Object.create(null) // The IDs that can be used for autocompletion
    this._watcher = null

    // Status can have four properties:
    // pre-boot: We're just out of the constructor
    // booting: Trying to locate a database
    // no-db: No database found, so not available
    // ready: GIMME YOUR IDS
    this._status = NOT_LOADED
    // this._loaded = false // Is the engine ready?
    // The sys object is required by the citeproc processor
    this._sys = {
      retrieveLocale: (lang) => { return this._getLocale(lang) },
      retrieveItem: (id) => { return this._items[id] }
    }

    // Create a global object so that we can easily pass rendered citations
    global.citeproc = {
      getIDs: () => {
        // Always include the status in the return.
        return {
          'ids': JSON.parse(JSON.stringify(this._idHint)),
          'status': this._status
        }
      },
      getCitation: (idList) => {
        return {
          'citation': this.getCitation(idList),
          'status': this._status
        }
      },
      updateItems: (idList) => { return this.updateItems(idList) },
      makeBibliography: () => { return this.makeBibliography() },
      hasBibTexAttachments: () => {
        return this._bibtexAttachments !== null && Object.keys(this._bibtexAttachments).length > 0
      },
      getBibTexAttachments: (id) => { return this._bibtexAttachments[id] }
    }

    // Be notified of potential updates
    global.config.on('update', () => {
      this._onConfigUpdate()
    })

    // Listen for synchronous citation messages from the renderer
    // Citeproc calls (either single citation or a whole cluster)
    ipcMain.on('cite', (event, message) => {
      if (message.type === 'get-citation') {
        // Return a single citation
        event.returnValue = {
          'citation': this.getCitation(message.content),
          'status': this._status
        }
      } else if (message.type === 'update-items') {
        // Update the items of the registry
        event.returnValue = this.updateItems(message.content)
      } else if (message.type === 'make-bibliography') {
        // Make and send out a bibliography based on the state of the registry
        event.sender.send('message', {
          'command': 'citeproc-bibliography',
          'content': this.makeBibliography()
        })
      }
    })

    /**
     * Listen for events coming from the citation renderer of the MarkdownEditor
     */
    ipcMain.on('citation-renderer', (event, content) => {
      const { command, payload } = content

      if (command === 'get-citation') {
        event.sender.webContents.send('citation-renderer', {
          'command': 'get-citation',
          'payload': {
            'originalCitation': payload.citation,
            'renderedCitation': this.getCitation(payload.citation)
          }
        })
      } else if (command === 'get-citation-sync') {
        event.returnValue = this.getCitation(payload.citation)
      }
    })

    // Read in the main library
    this.load()
  }

  /**
   * Shuts down the service provider
   */
  shutdown () {
    global.log.verbose('Citeproc provider shutting down ...')
    this.unload()
    return true
  }

  /**
   * Initiates the watching of the main library and changes it if applicable.
   * @return {void} Doesn't return
   */
  _watchLib () {
    if (!this._watcher) {
      this._watcher = chokidar.watch(this._mainLibrary, {
        ignored: /(^|[/\\])\../,
        persistent: true,
        ignoreInitial: true
      }).on('all', (event, path) => {
        // Reload the whole thing. But do it after a timeout to let Zotero time
        // to complete writing the file.
        setTimeout(() => { this.load() }, 2000)
        global.log.verbose('Reloading citation database ...')
        global.ipc.notify(trans('gui.citeproc.reloading'))
      })
    } else {
      // Watcher is already running, so simply exchange the path.
      this._watcher.close() // Remove all event listeners
      this._watcher.add(this._mainLibrary) // Add the (potentially changed lib)
    }
  }

  /**
   * There has been a config update. In case the main library has changed, reload
   */
  _onConfigUpdate () {
    if (global.config.get('export.cslLibrary') !== this._mainLibrary) {
      global.ipc.notify(trans('gui.citeproc.reloading'))
      this.load()
    }
  }

  /**
   * Reads in the CSL data and, if that succeeds, calls the parser.
   * @return {void} Does not return.
   */
  _read () {
    this._mainLibrary = global.config.get('export.cslLibrary')
    if (this._mainLibrary.trim() === '') {
      // There is no library to load.
      this._status = NO_DB
      global.log.info('[Citeproc Provider] There is no CSL library selected in the preferences. Nothing to do.')
      return
    }

    try {
      fs.readFile(this._mainLibrary, 'utf8', (err, data) => {
        if (err) {
          global.log.error(`[Citeproc Provider] Could not load main CSL library: ${err.message}`, err)
          this._status = NO_DB
          return
        }
        // Now we are booting
        this._status = BOOTING
        // First make sure to watch the file for changes
        this._watchLib()
        this._parse(data)
      })
    } catch (e) {
      global.log.error(`[Citeproc Provider] Unknown error while loading main CSL library: ${e.message}`, e)
      this._status = NO_DB
    }
  }

  /**
   * Parses the JSON data into the internal array. Afterwards, calls _initProcessor()
   * @param  {JSON} cslData The data to be parsed.
   * @return {void}     Does not return.
   */
  _parse (cslData) {
    try {
      this._cslData = JSON.parse(cslData)
    } catch (e) {
      try {
        // Didn't work, so let's try to parse it as BibTex data.
        this._cslData = BibTexParser.parse(cslData)
        // If we're here, we had a BibTex library --> extract the attachments
        try {
          let attachments = extractBibTexAttachments(cslData, path.dirname(this._mainLibrary))
          this._bibtexAttachments = attachments
        } catch (err) {
          global.log.error(`[Citeproc Provider] Could not extract BibTex attachments: ${err.message}`, err)
        }
      } catch (e) {
        global.log.error('[Citeproc Provider] Could not parse library file: ' + e.message, e)
        // Nopey.
        global.ipc.notify(trans('gui.citeproc.error_db'))
        this._status = ERROR
        return
      }
    }
    // First we need to reorder the read data so that it can be passed to the
    // sys object
    for (let i = 0, ilen = this._cslData.length; i < ilen; i++) {
      let item = this._cslData[i]
      // if (!item.issued) continue
      let id = item.id
      // Check the validity of the citation
      try {
        Citr.parseSingle(`@${id}`)
        this._items[id] = item
        this._ids[id] = true
      } catch (err) {
        global.log.warning(`[Citeproc Provider] Malformed CiteKey @${id}` + err.message)
        if (global.application.isBooting()) {
          // In case the application is still booting, cache the message and delay sending
          // TODO: This is goddamned ugly.
          setTimeout(() => { global.ipc.notify(err.message) }, 5000)
        } else {
          // Otherwise immediately dispatch
          global.ipc.notify(err.message)
        }
      }
    }

    // Now we are ready. Initiate the processor.
    this._initProcessor()
  }

  /**
   * Verifies the integrity of the database, which means: Test through all keys
   * and remove those that produce errors when processed by citeproc-js. Remove
   * them to ensure that all other keys can be loaded in the meantime.
   */
  _verifyIntegrity () {
    let errors = []
    for (let key of Object.keys(this._ids)) {
      try {
        // Try to make a citation "cluster" out of each single CiteKey
        this._engine.makeCitationCluster([this._sys.retrieveItem(key)])
      } catch (e) {
        console.error(e)
        // In this case, to ensure correct loading of the rest of the
        // database, remove the problematic cite key.
        delete this._ids[key]
        errors.push({ 'key': key, 'error': e })
      }
    }

    // We all know that people can close dialog windows if they appear. If that
    // happens, let's make sure the errors are at least in the log file!
    if (errors.length > 0) {
      global.log.error(`[Citeproc Provider] ${errors.length} errors during database integrity check!`, errors)
    }

    return errors
  }

  /**
   * Initialises the processor with the current application language, the selected
   * style and the sys-processor. If that succeeds, this function sets the loaded
   * flag to true, so that requests can be filed.
   * @return {void} Does not return.
   */
  _initProcessor () {
    try {
      // Load the engine with the current application language. As this citing
      // is only for preview purposes, it should follow the language like the
      // rest of the interface.
      this._engine = new citeproc.Engine(this._sys, this._mainStyle, this._lang)
      // ATTENTION: This is a development extension we're using to auto-wrap
      // links and DOIs in a-tags so that the user can click them in the
      // bibliography. Remove if it becomes unstable and implement manually.
      this._engine.opt.development_extensions.wrap_url_and_doi = true
      this._status = READY
      // This function will make sure malformed keys will not remain in the
      // database and can be reported to the user.
      let errors = this._verifyIntegrity()
      if (errors.length > 0) {
        // Report errors
        let report = {
          'title': trans('gui.citeproc.error_report_title'),
          'message': trans('gui.citeproc.error_report_message', errors.length),
          'additionalInfo': errors.map(elem => elem.key + ': ' + elem.error).join('\n')
        }

        if (global.application.isBooting()) {
          // In case the application is still booting, cache the message and delay sending
          // TODO: This is goddamned ugly.
          setTimeout(() => { global.ipc.notifyError(report) }, 5000)
        } else {
          // Otherwise immediately dispatch
          global.ipc.notifyError(report)
        }
      }

      this._loadIdHint()
    } catch (e) {
      global.log.error('[Citeproc Provider] Could not initialize citation processor: ' + e.message, e)
      this._status = ERROR
    }
  }

  /**
   * Loads the object that contains the correct citations for all items
   * @return {Object} An Array containing the correct texts and displayTexts.
   */
  _loadIdHint () {
    // Now create the array that can be used by the editor's autocomplete
    this._idHint = Object.keys(this._ids).map((key) => {
      let dt = this.getCitation(`[@${key}]`).replace(/[()]|<i>|<\/i>/g, '') // Remove the braces
      let title = this._sys.retrieveItem(key).title

      // Add the title if it hasn't been assumed the author by the citeproc engine
      if (dt.indexOf(title) < 0) dt += ': ' + title

      // Return the correct object
      return {
        'text': key,
        'displayText': dt
      }
    })

    // Now the whole library is fully loaded. Let's send the citeproc-IDs to the
    // renderer.
    global.ipc.send('citeproc-ids', {
      'ids': JSON.parse(JSON.stringify(this._idHint)),
      'status': this._status
    })
  }

  /**
   * Reads in a language XML file and returns either its contents, or false (in
   * which case the engine will fall back some times until it ends with en-US)
   * @param  {string} lang The language to be loaded.
   * @return {string|boolean}  Either the contents of the XML file, or false.
   */
  _getLocale (lang) {
    // Takes a lang in the format xx-XX and has to return the corresponding XML
    // file. Let's do just that!

    if (lang === 'us') {
      // From the docs: "The function _must_ return a value for the us locale."
      // See https://citeproc-js.readthedocs.io/en/latest/running.html#retrievelocale
      lang = 'en-US'
    }

    try {
      const localePath = path.join(__dirname, `./assets/csl-locales/locales-${lang}.xml`)
      global.log.info(`[Citeproc Provider] Loading CSL locale file at ${localePath} ...`)
      // NOTE that this System function must be synchronous, so we cannot use
      // the asynchronous promises API here.
      return fs.readFileSync(localePath, { encoding: 'utf8' })
    } catch (e) {
      // File not found -> Let the engine fall back to a default.
      return false
    }
  }

  /**
   * Makes sure only existing items are pushed to an array that is about to be
   * passed to the engine. See https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html
   * for all possible variants of legitimate input into the engine.
   * @param  {Array} list An array containing a list of unsanitised IDs.
   * @return {Array}  The sanitised array, with which it is safe to call the engine
   */
  _sanitiseItemList (list) {
    if (!Array.isArray(list)) list = [list] // Assume single ID
    if (list.length === 0) return list // Empty list
    if (typeof list[0] === 'string') {
      // ID only list
      return list.filter(id => (this._sys.retrieveItem(id) !== undefined))
    } else if (list[0].hasOwnProperty('id')) {
      // Cite item list
      return list.filter(elem => (this._sys.retrieveItem(elem.id) !== undefined))
    } else if (list[0].hasOwnProperty('citationItems')) {
      // citations list -> undo array in this case (b/c it's just an object)
      list = list[0]
      list.citationItems = list.citationItems.filter(elem => (this._sys.retrieveItem(elem.id) !== undefined))
      return list
    } else {
      return [] // No other possibilities
    }
  }

  /**
   * PUBLIC FUNCTIONS
   */

  /**
   * Unloads the complete engine
   * @return {ZettlrCiteproc} Chainability
   */
  unload () {
    this._status = NOT_LOADED
    this._engine = null
    this._ids = Object.create(null)
    this._bibtexAttachments = null
    if (this._watcher != null) {
      this._watcher.close()
      this._watcher = null
    }
    return this
  }

  /**
   * (Re-)loads the complete engine
   * @return {ZettlrCiteproc} Chainability
   */
  load () {
    // First unload the engine if not already
    if (this._status !== NOT_LOADED) this.unload()
    // Commence the loading procedure
    this._read()
  }

  /**
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   * @param  {String} citation Array containing the IDs to be returned
   * @return {String}     The rendered string
   */
  getCitation (citation) {
    if (this._status !== READY) return undefined // Don't try to access the engine before loaded
    let citations
    try {
      citations = Citr.parseSingle(citation)
    } catch (err) {
      global.log.error(`[citeproc] Citr.parseSingle: Could not parse citation ${citation}. ` + err.message, err)
      return undefined
    }

    citations = this._sanitiseItemList(citations)
    if (citations.length === 0) return undefined // Nothing to render
    try {
      return this._engine.makeCitationCluster(citations)
    } catch (e) {
      global.log.error(`[citeproc] makeCitationCluster: Could not create citation cluster ${citations}. ` + e.message, e)
      return undefined
    }
  }

  /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   * @param  {Array} citations A list of IDs
   * @return {Boolean}    An indicator whether or not the call succeeded and the registry has been updated.
   */
  updateItems (citations) {
    if (this._status !== READY) return this._status // Don't try to access the engine before loaded
    try {
      let passed = []
      for (let i = 0; i < citations.length; i++) {
        if (Citr.util.validateCitationID(citations[i])) {
          passed.push(citations[i])
        }
      }
      this._engine.updateItems(this._sanitiseItemList(passed))
      return true
    } catch (e) {
      global.log.error('[citeproc] Could not update citation cluster. ' + e.message, citations)
      return false
    }
  }

  /**
   * Directs the engine to create a bibliography from the items currently in the
   * registry (this can be updated by calling updateItems with an array of IDs.)
   * @return {CSLBibTex} A CSL object containing the bibliography.
   */
  makeBibliography () {
    if (this._status !== READY) return this._status // Don't try to access the engine before loaded
    try {
      return this._engine.makeBibliography()
    } catch (e) {
      global.log.warning(e.message, e)
      return false // Something went wrong (e.g. falsy items in the registry)
    }
  }

  /**
   * Can be used to queue whether or not the engine is ready
   * @return {Boolean} The status of the engine
   */
  isReady () { return this._status === READY }

  /**
   * Has there been an error during boot?
   * @return {Boolean} True, if there was an error.
   */
  hasError () { return this._status === ERROR }

  /**
   * Is a database available?
   * @return {Boolean} True, if no database has been found.
   */
  hasNoDB () { return this._status === NO_DB }
}
