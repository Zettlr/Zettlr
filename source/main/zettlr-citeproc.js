/* global */
/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrCiteproc
* CVM-Role:        Model
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This class represents an interface between the citeproc-js
*                  library, a Zotero generated BibLaTeX file (ideally in CSL
*                  JSON) and your texts in Markdown. This class is therefore
*                  conceptualised as a model, because it models a whole
*                  database.
*
* END HEADER
*/

const citeproc = require('citeproc')
const chokidar = require('chokidar') // We'll just use the one-liner to watch the library file.
const fs = require('fs')
const path = require('path')
const { trans } = require('../common/lang/i18n.js')

// Statuses the engine can be in
const NOT_LOADED = 0
const BOOTING = 1
const NO_DB = 2
const ERROR = 3
const READY = 4

/**
 * This class enables to export citations from a CSL JSON file to HTML.
 */
class ZettlrCiteproc {
  constructor () {
    this._mainLibrary = ''
    // The Zettlr internal preview of these citations will always use Chicago,
    // because (a) it's just a preview, and (b) Chicago is the default of Pandoc.
    this._styleID = 'chicago-author-date'
    this._lang = global.config.get('appLang')
    this._mainStyle = fs.readFileSync(path.join(__dirname, `./assets/csl-styles/${this._styleID}.csl`), 'utf8')
    this._engine = null // Holds the CSL engine
    this._cslData = null // Holds the parsed CSL data (JSON)
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
      makeBibliography: () => { return this.makeBibliography() }
    }

    // Be notified of potential updates
    global.config.on('update', () => {
      this._onConfigUpdate()
    })

    // Read in the main library
    this.load()
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
      this.load()
    }
  }

  /**
   * Reads in the CSL data and, if that succeeds, calls the parser.
   * @return {void} Does not return.
   */
  _read () {
    this._mainLibrary = global.config.get('export.cslLibrary')
    try {
      fs.readFile(this._mainLibrary, 'utf8', (err, data) => {
        if (err) {
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
      this._status = NO_DB
    }
  }

  /**
   * Parses the JSON data into the internal array. Afterwards, calls _initProcessor()
   * @param  {JSON} cslData The data to be parsed.
   * @return {void}         Does not return.
   */
  _parse (cslData) {
    try {
      this._cslData = JSON.parse(cslData)
    } catch (e) {
      this._status = ERROR
      return
    }
    // First we need to reorder the read data so that it can be passed to the
    // sys object
    for (let i = 0, ilen = this._cslData.length; i < ilen; i++) {
      let item = this._cslData[i]
      if (!item.issued) continue
      let id = item.id
      this._items[id] = item
      this._ids[id] = true // Create a fast accessible object (instead of slow array)
    }
    // Now we are ready. Initiate the processor.
    this._initProcessor()
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
      this._status = READY
      this._loadIdHint()
    } catch (e) {
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
      let dt = this.getCitation([{ 'id': key }]).replace(/[()]|<i>|<\/i>/g, '') // Remove the braces
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
   * @return {Mixed}      Either the contents of the XML file, or false.
   */
  _getLocale (lang) {
    // Takes a lang in the format xx-XX and has to return the corresponding XML
    // file. Let's do just that!
    let p = path.join(__dirname, `./assets/csl-locales/locales-${lang}.xml`)
    try {
      fs.lstatSync(p)
      return fs.readFileSync(p, 'utf8')
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
   * @return {Array}      The sanitised array, with which it is safe to call the engine
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
   * @param  {Array} citeIDs Array containing the IDs to be returned
   * @return {String}         The rendered string
   */
  getCitation (citeIDs) {
    if (this._status !== READY) return undefined // Don't try to access the engine before loaded
    citeIDs = this._sanitiseItemList(citeIDs)
    if (citeIDs.length === 0) return undefined // Nothing to render
    try {
      return this._engine.makeCitationCluster(citeIDs)
    } catch (e) {
      console.error(e)
      return undefined
    }
  }

  /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   * @param  {Array} idList An unsanitised array of items to be cited.
   * @return {Boolean}        An indicator whether or not the call succeeded and the registry has been updated.
   */
  updateItems (idList) {
    if (this._status !== READY) return this._status // Don't try to access the engine before loaded
    try {
      idList = this._sanitiseItemList(idList)
      this._engine.updateItems(idList)
      return true
    } catch (e) {
      console.log(e)
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

module.exports = ZettlrCiteproc
