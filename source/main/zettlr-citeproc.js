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
const fs = require('fs')
const path = require('path')

class ZettlrCiteproc {
  /**
   * Initialises ZettlrCiteproc and also directly tries to boot the engine.
   */
  constructor () {
    this._mainLibrary = global.config.get('cslLibrary')
    // The Zettlr internal preview of these citations will always use Chicago,
    // because (a) it's just a preview, and (b) Chicago is the default of Pandoc.
    this._styleID = 'chicago-author-date'
    this._lang = global.config.get('app_lang').replace('_', '-')
    this._mainStyle = fs.readFileSync(path.join(__dirname, `./assets/csl-styles/${this._styleID}.csl`), 'utf8')
    this._engine = null // Holds the CSL engine
    this._cslData = null // Holds the parsed CSL data (JSON)
    this._items = {} // ID-accessible CSL data array.
    this._ids = Object.create(null) // Database index array
    this._loaded = false // Is the engine ready?
    // The sys object is required by the citeproc processor
    this._sys = {
      retrieveLocale: (lang) => { return this._getLocale(lang) },
      retrieveItem: (id) => { return this._items[id] }
    }
    // Read in the main library
    this._read()

    // Create a global object so that we can easily pass rendered citations
    global.citeproc = {
      getIDs: () => { return JSON.parse(JSON.stringify(this._ids)) },
      getCitation: (idList) => { return this.getCitation(idList) },
      updateItems: (idList) => { return this.updateItems(idList) },
      makeBibliography: () => { return this.makeBibliography() }
    }
  }

  /**
   * Reads in the CSL data and, if that succeeds, calls the parser.
   * @return {void} Does not return.
   */
  _read () {
    try {
      fs.lstatSync(this._mainLibrary)
      fs.readFile(this._mainLibrary, 'utf8', (err, data) => {
        if (err) return // TODO: Error handling
        this._parse(data)
      })
    } catch (e) {
      // Couldn't find library! TODO: Error handling
    }
  }

  /**
   * Parses the JSON data into the internal array. Afterwards, calls _initProcessor()
   * @param  {JSON} cslData The data to be parsed.
   * @return {void}         Does not return.
   */
  _parse (cslData) {
    this._cslData = JSON.parse(cslData)
    // First we need to reorder the read data so that it can be passed to the
    // sys object
    for (let i = 0, ilen = this._cslData.length; i < ilen; i++) {
      let item = this._cslData[i]
      if (!item.issued) continue
      // if (item.URL) delete item.URL
      let id = item.id
      this._items[id] = item
      this._ids[id] = true // Create a fast accessible object (instead of slow array)
    }
    // Now we are ready. Initiate the processor
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
      this._loaded = true
    } catch (e) {
      console.log(e)
    }
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
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   * @param  {Array} citeIDs Array containing the IDs to be returned
   * @return {String}         The rendered string
   */
  getCitation (citeIDs) {
    if (!this._loaded) return false // Don't try to access the engine before loaded
    citeIDs = this._sanitiseItemList(citeIDs)
    if (citeIDs.length === 0) return false // Nothing to render
    try {
      return this._engine.makeCitationCluster(citeIDs)
    } catch (e) {
      return false
    }
  }

  /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   * @param  {Array} idList An unsanitised array of items to be cited.
   * @return {Boolean}        An indicator whether or not the call succeeded and the registry has been updated.
   */
  updateItems (idList) {
    if (!this._loaded) return false // Don't try to access the engine before loaded
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
    if (!this._loaded) return false // Don't try to access the engine before loaded
    try {
      return this._engine.makeBibliography()
    } catch (e) {
      return false // Something went wrong (e.g. falsy items in the registry)
    }
  }
}

module.exports = ZettlrCiteproc
