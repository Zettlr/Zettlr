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
  constructor () {
    this._mainLibrary = global.config.get('cslLibrary')
    this._styleID = 'apa'
    this._mainStyle = fs.readFileSync(path.join(__dirname, `./assets/csl_styles/${this._styleID}.csl`), 'utf8')
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

  _parse (cslData) {
    this._cslData = JSON.parse(cslData)
    // First we need to reorder the read data so that it can be passed to the
    // sys object
    for (let i = 0, ilen = this._cslData.length; i < ilen; i++) {
      let item = this._cslData[i]
      if (!item.issued) continue
      if (item.URL) delete item.URL
      let id = item.id
      this._items[id] = item
      this._ids[id] = true // Create a fast accessible object (instead of slow array)
    }
    // Now we are ready. Initiate the processor
    this._initProcessor()
  }

  _initProcessor () {
    try {
      this._engine = new citeproc.Engine(this._sys, this._mainStyle, 'en-US')
      this._loaded = true
    } catch (e) {
      console.log(e)
    }
  }

  _getLocale (lang) {
    // Takes a lang in the format xx-XX and has to return the corresponding XML
    // file. Let's do just that!
    let p = path.join(__dirname, `./assets/csl_locales/locales-${lang}.xml`)
    try {
      fs.lstatSync(p)
      return fs.readFileSync(p, 'utf8')
    } catch (e) {
      // Whoops TODO error handling
      return false
    }
  }

  /**
   * Makes sure only existing items are pushed to an array that is about to be
   * passed to the engine.
   * @param  {Array} list An array containing a list of unsanitised IDs.
   * @return {Array}      The sanitised array, with which it is safe to call the engine
   */
  _sanitiseItemList (list) {
    return list.filter(id => (this._sys.retrieveItem(id) !== undefined))
  }

  /**
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   * @param  {Array} citeIDs Array containing the IDs to be returned
   * @return {String}         The rendered string
   */
  getCitation (citeIDs) {
    if (!this._loaded) return false // Don't try to access the engine before loaded
    if (!Array.isArray(citeIDs)) citeIDs = [citeIDs] // Assume single ID
    citeIDs = this._sanitiseItemList(citeIDs)
    citeIDs = citeIDs.map(item => this._sys.retrieveItem(item)) // the Citation cluster needs the full items
    if (citeIDs.length === 0) return false // Nothing to render
    return this._engine.makeCitationCluster(citeIDs)
  }

  /**
   * Updates the items that the engine uses for bibliographies. Must be called
   * prior to makeBibliography()
   * @param  {Array} idList An unsanitised array of items to be cited.
   * @return {Boolean}        An indicator whether or not the call succeeded and the registry has been updated.
   */
  updateItems (idList) {
    try {
      idList = this._sanitiseItemList(idList)
      this._engine.updateItems(idList)
      return true
    } catch (e) {
      console.log(e)
      return false
    }
  }

  makeBibliography () {
    return this._engine.makeBibliography()
  }
}

module.exports = ZettlrCiteproc
