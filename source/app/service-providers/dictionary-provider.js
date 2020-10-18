/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DictionaryProvider class
 * CVM-Role:        Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file loads the dictionaries on instantiation and
 *                  provides functions to check misspelled words.
 *
 * END HEADER
 */

const EventEmitter = require('events')
const NSpell = require('nspell')
const path = require('path')
const fs = require('fs')

const { ipcMain, app } = require('electron')
const { getDictionaryFile } = require('../../common/lang/i18n')
const { promisify } = require('util')
const readFile = promisify(fs.readFile)

/**
 * This class loads and unloads dictionaries according to the configuration set
 * by the user on runtime. It provides functions that allow to search all
 * loaded dictionaries for words and even change the dictionaries during runtime.
 */
module.exports = class DictionaryProvider extends EventEmitter {
  constructor () {
    super()
    global.log.verbose('Dictionary provider booting up ...')
    // Array containing all loaded NSpell dictionaries
    this._typos = []
    // Array containing the language codes for which checking currently works
    this._loadedDicts = []
    // Path to the user dictionary
    this._userDictionaryPath = path.join(app.getPath('userData'), 'user.dic')
    // The user dictionary
    this._userDictionary = ''

    // Inject global methods
    global.dict = {
      on: (message, callback) => { this.on(message, callback) },
      off: (message, callback) => { this.off(message, callback) },
      /**
       * Returns a copy of the full user dictionary.
       * @return {Array} The user dictionary.
       */
      getUserDictionary: () => { return JSON.parse(JSON.stringify(this._userDictionary)) },
      /**
       * Replaces the current user dictionary with a new one
       * @param {Array} dict The new dictionary.
       * @return {Boolean} Whether or not the call succeeded.
       */
      setUserDictionary: (dict) => {
        if (!Array.isArray(dict)) return false
        this._userDictionary = dict
        // Send an invalidation message to the renderer
        global.ipc.send('invalidate-dict')
        return true
      }
    }

    // Listen for synchronous messages from the renderer process for typos.
    ipcMain.on('typo', (event, message) => {
      if (message.type === 'check') {
        event.returnValue = this.check(message.term)
      } else if (message.type === 'suggest') {
        event.returnValue = this.suggest(message.term)
      } else if (message.type === 'add') {
        event.returnValue = this.add(message.term)
      }
    })

    // Reload as soon as the config has been updated
    global.config.on('update', (opt) => {
      // We are only interested in changes to the selectedDicts option
      if (opt !== 'selectedDicts') return
      this.reload()
    })

    // Afterwards, set the timeout for loading the dictionaries
    setTimeout(() => {
      this.reload()
      this._loadUserDict() // On first start, load the user dictionary as well
    }, 5000)
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  shutdown () {
    global.log.verbose('Dictionary provider shutting down ...')
    fs.writeFileSync(this._userDictionaryPath, this._userDictionary.join('\n'), 'utf8')
    return true
  }

  /**
   * (Re)Loads the dictionaries efficiently based upon the selected dictionaries
   * @return {Promise} Does not throw, as we catch errors. TODO: Log misloads!
   */
  async _load () {
    let selectedDicts = global.config.get('selectedDicts')
    let dictsToLoad = []

    // This function can also be called during runtime to exchange some dicts,
    // so make sure we don't reload these monstrous things all too often.
    // 1. Which dicts do we have to load?
    for (let dict of selectedDicts) {
      if (!this._loadedDicts.includes(dict)) dictsToLoad.push(dict)
    }

    // 2. Which of the already loaded dicts can be trashed?
    for (let dict of this._loadedDicts) {
      if (!selectedDicts.includes(dict)) {
        let index = this._loadedDicts.indexOf(dict)
        this._loadedDicts.splice(index, 1) // Remove both from the loadedDicts...
        this._typos.splice(index, 1) // ... and the typos themselves
      }
    }

    for (let dict of dictsToLoad) {
      // First request a dictionary.
      let dictMeta = getDictionaryFile(dict)
      if (dictMeta.status !== 'exact') continue // Only consider exact matches
      let aff = null
      let dic = null

      try {
        aff = await readFile(dictMeta.aff, 'utf8')
      } catch (e) {
        continue
      }

      try {
        dic = await readFile(dictMeta.dic, 'utf8')
      } catch (e) {
        continue
      }

      this._typos.push(new NSpell(aff, dic))
      this._loadedDicts.push(dict)
    } // END for

    // Finally emit the update event
    this.emit('update', this._loadedDicts)

    // Send an invalidation message to the renderer
    global.ipc.send('invalidate-dict')
  }

  /**
   * Loads the user dictionary from file.
   * @return {Promise} Will resolve after the dictionary has been loaded.
   */
  async _loadUserDict () {
    try {
      fs.lstatSync(this._userDictionaryPath)
    } catch (e) {
      // Create a new file (and add Zettlr as a correct word :3)
      fs.writeFileSync(this._userDictionaryPath, 'Zettlr', 'utf8')
    }
    this._userDictionary = await readFile(this._userDictionaryPath, 'utf8')
    this._userDictionary = this._userDictionary.split(/\n/)
    // If the user dictionary is empty, the split will not create an array
    // Send an invalidation message to the renderer so that it reloads all words
    global.ipc.send('invalidate-dict')
  }

  /**
   * Checks the given term against the dictionaries and determines whether its
   * accurate.
   * @param  {String} term The word/term to check
   * @return {Boolean}      True if the word was confirmed by any dictionary, or false.
   */
  check (term) {
    // Don't check until all are loaded
    if (global.config.get('selectedDicts').length !== this._typos.length) {
      return 'not-ready'
    }

    // We need to differentiate between not ready and ready, but there are no
    // dictionaries. Because in the latter case, returning true means to let the
    // renderer save the words anyway. Object indexing is still more efficient
    // than querying the main process via IPC.
    if (this._typos.length === 0) return true

    let correct = false
    for (let typo of this._typos) {
      if (typo.correct(term)) correct = true
    }

    // Last but not least check the user dictionary
    if (this._userDictionary.includes(term)) correct = true

    return correct
  }

  /**
   * Returns an array of possible suggestions for the given word.
   * @param  {String} term The term or word to check for.
   * @return {Array}      An array containing all returned possible alternatives.
   */
  suggest (term) {
    // Return no suggestions
    if (global.config.get('selectedDicts').length !== this._typos.length) return []
    if (this._typos.length === 0) return []

    let suggestions = []
    for (let typo of this._typos) {
      suggestions = suggestions.concat(typo.suggest(term))
    }

    return suggestions
  }

  /**
   * Adds the given term to the user dictionary
   * @param {String} term The term to add
   */
  add (term) {
    // Adds the given term to the user dictionary
    if (!this._userDictionary.includes(term)) {
      this._userDictionary.push(term)
      // Send an invalidation message to the renderer so that it reloads all words
      global.ipc.send('invalidate-dict')
    }

    // Always return true (it'll get send to the renderer, but it won't deal with it.)
    return true
  }

  /**
   * Initiates a full reload of the loaded dictionaries.
   * @return {void} Does not return.
   */
  reload () {
    if (global.config.get('selectedDicts') === this._loadedDicts) return

    // Reload the dictionary based upon the new selected dictionaries.
    this._load()
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
