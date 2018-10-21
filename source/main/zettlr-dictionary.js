/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDictionary class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file loads the dictionaries on instantiation and
 *                  provides functions to check misspelled words.
 *
 * END HEADER
 */

const Typo = require('typo-js')
const path = require('path')
const fs = require('fs')

class ZettlrDictionary {
  constructor () {
    this._typos = []
    this._toLoad = 0 // If this number equals the length of the _typos array, all are loaded
    this._loadedDicts = [] // Array containing the language codes for which checking currently works
    this._load()
  }

  _load () {
    let dictsToLoad = global.config.get('selectedDicts')
    let dictPath = path.join(__dirname, 'assets/dict')

    for (let dict of dictsToLoad) {
      this._toLoad++
      fs.readFile(path.join(dictPath, dict, `${dict}.aff`), 'utf8', (err, affData) => {
        if (err) {
          this._toLoad-- // Decrement so that Zettlr checks with less dictionaries
        } else if (affData) {
          fs.readFile(path.join(dictPath, dict, `${dict}.dic`), 'utf8', (err, dicData) => {
            if (err) {
              this._toLoad--
            } else if (dicData) {
              // Finally push the typo!
              console.log(`Data length is: DIC: ${affData.length}, AFF: ${dicData.length}`)
              this._typos.push(new Typo(dict, affData, dicData, {}))
              console.log(`Dictionary ${dict} loaded!`)
              this._loadedDicts.push(dict)
            } // END second else if
          }) // END second readFile
        } // END first else if
      }) // END first readFile
    } // END for
  }

  check (term) {
    if (this._toLoad > this._typos.length) return true // Don't check until all are loaded

    let correct = false
    for (let typo of this._typos) {
      if (typo.check(term)) correct = true
    }

    return correct
  }

  suggest (term) {
    if (this._toLoad > this._typos.length) return [] // Return no suggestions

    let suggestions = []
    for (let typo of this._typos) {
      suggestions = suggestions.concat(typo.suggest(term))
    }

    return suggestions
  }

  /**
   * Get all dictionaries that have been actually loaded.
   * @return {Array} All loaded dicts (precisely: their language codes)
   */
  getDicts () { return this._loadedDicts }

  /**
   * Does ZettlrDictionary check for the given language, i.e. did it load?
   * @param  {string} lang The language code, e.g. en_GB
   * @return {Boolean}      True, if the dictionary has been loaded, or false.
   */
  checks (lang) { return this._loadedDicts.includes(lang) }
}

module.exports = ZettlrDictionary
