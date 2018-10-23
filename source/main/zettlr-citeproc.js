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
    this._mainStyle = fs.readFileSync(path.join(__dirname, './assets/csl_styles/chicago-author-date.csl'), 'utf8')
    this._engine = null // Holds the CSL engine
    this._cslData = null // Holds the parsed CSL data (JSON)
    this._items = {} // ID-accessible CSL data array.
    this._ids = [] // Array containing the IDs
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
      get: (idList) => { return this.getCitation(idList) }
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
      this._ids.push(id)
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
   * Takes IDs as set in Zotero and returns Author-Date citations for them.
   * @param  {Array} citeIDs Array containing the IDs to be returned
   * @return {String}         The rendered string
   */
  getCitation (citeIDs) {
    if (!this._loaded) return false // Don't try to access the engine before loaded
    if (!Array.isArray(citeIDs)) return false // What did you just pass?
    let list = []
    for (let id of citeIDs) {
      if (this._items[id] === undefined) continue // Don't include non-existent
      list.push(this._items[id])
    }
    if (list.length === 0) return false // Nothing to render
    return this._engine.makeCitationCluster(list)
  }
}

module.exports = ZettlrCiteproc
