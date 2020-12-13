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

import EventEmitter from 'events'
import NSpell from 'nspell'
import path from 'path'
import { promises as fs } from 'fs'

import { ipcMain, app } from 'electron'
import { getDictionaryFile } from '../../common/i18n'
import broadcastIpcMessage from '../../common/util/broadcast-ipc-message'

/**
 * This class loads and unloads dictionaries according to the configuration set
 * by the user on runtime. It provides functions that allow to search all
 * loaded dictionaries for words and even change the dictionaries during runtime.
 */
export default class DictionaryProvider extends EventEmitter {
  private readonly _typos: NSpell[]
  private readonly _loadedDicts: string[]
  private readonly _userDictionaryPath: string
  private _userDictionary: string[]
  private _fileLock: boolean
  private _unwrittenChanges: boolean

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
    this._userDictionary = ['Zettlr']

    // Flags for writing the file
    this._fileLock = false
    this._unwrittenChanges = false

    // Inject global methods
    global.dict = {
      on: (message: string, callback: Function) => {
        this.on(message, callback as any)
      },
      off: (message: string, callback: Function) => {
        this.off(message, callback as any)
      },
      /**
       * Returns a copy of the full user dictionary.
       * @return {Array} The user dictionary.
       */
      getUserDictionary: () => {
        // Clone the array
        return this._userDictionary.map(elem => elem)
      },
      /**
       * Replaces the current user dictionary with a new one
       * @param {Array} dict The new dictionary.
       * @return {Boolean} Whether or not the call succeeded.
       */
      setUserDictionary: (dict: string[]) => {
        if (!Array.isArray(dict)) {
          return false
        }

        this._userDictionary = dict
        this._userDictionary = [...new Set(this._userDictionary)]
        this._userDictionary = this._userDictionary.filter(word => word.trim() !== '')

        // Send an invalidation message to the renderer
        broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })

        return true
      }
    }

    // Listen for synchronous messages from the renderer process for typos.
    ipcMain.on('dictionary-provider', (event, message) => {
      const { command, term } = message
      if (command === 'check') {
        event.returnValue = this.check(term)
      } else if (command === 'suggest') {
        event.returnValue = this.suggest(term)
      } else if (command === 'add') {
        event.returnValue = this.add(term)
      }
    })

    // Reload as soon as the config has been updated
    global.config.on('update', (opt: string) => {
      // We are only interested in changes to the selectedDicts option
      if (opt === 'selectedDicts') {
        this.reload()
      }
    })

    // Afterwards, set the timeout for loading the dictionaries
    setTimeout(() => {
      this.reload()
      this._loadUserDict() // On first start, load the user dictionary as well
        .catch(err => {
          global.log.error(`[Dictionary Provider] Could not read user dictionary: ${err.message as string}`, err)
        })
    }, 5000)
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<boolean> {
    global.log.verbose('Dictionary provider shutting down ...')
    await this._persist()
    return true
  }

  /**
   * (Re)Loads the dictionaries efficiently based upon the selected dictionaries
   * @return {Promise} Does not throw, as we catch errors. TODO: Log misloads!
   */
  async _load (): Promise<void> {
    let selectedDicts = global.config.get('selectedDicts') as string[]
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
      let dictMeta = getDictionaryFile(dict) as any // TODO
      if (dictMeta.status !== 'exact') continue // Only consider exact matches
      let aff = null
      let dic = null

      try {
        aff = await fs.readFile(dictMeta.aff, 'utf8')
      } catch (e) {
        continue
      }

      try {
        dic = await fs.readFile(dictMeta.dic, 'utf8')
      } catch (e) {
        continue
      }

      this._typos.push(new NSpell(aff, dic))
      this._loadedDicts.push(dict)
    } // END for

    // Finally emit the update event
    this.emit('update', this._loadedDicts)

    // Send an invalidation message to the renderer
    broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })
  }

  /**
   * Loads the user dictionary from file.
   * @return {Promise} Will resolve after the dictionary has been loaded.
   */
  async _loadUserDict (): Promise<void> {
    try {
      await fs.lstat(this._userDictionaryPath)
    } catch (e) {
      // Create a new file and add the current user dictionary to it
      await this._persist()
    }

    const fileContents = await fs.readFile(this._userDictionaryPath, 'utf8')
    this._userDictionary = fileContents.split('\n')

    // String.split() returns an array with one empty string if the file is
    // empty, so we need to perform in total two operations: Make a set out of
    // it (remove duplicates) and remove empty strings
    this._userDictionary = [...new Set(this._userDictionary)]
    this._userDictionary = this._userDictionary.filter(elem => elem.trim() !== '')

    // If the user dictionary is empty, the split will not create an array
    // Send an invalidation message to the renderer so that it reloads all words
    broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })
  }

  /**
   * Persists the user dictionary to disk
   */
  private async _persist (): Promise<void> {
    if (this._fileLock) {
      // If there is a file lock, set the changes flag and abort
      this._unwrittenChanges = true
      return
    }

    // Initiate the filelock, write, release the lock
    this._fileLock = true
    this._unwrittenChanges = false
    const data = this._userDictionary.join('\n')
    await fs.writeFile(this._userDictionaryPath, data)
    this._fileLock = false

    // After we're done, check if someone tried to call the function in the
    // meantime. If so, the flag will be true by now: immediately call it again.
    if (this._unwrittenChanges) {
      return await this._persist()
    }
  }

  /**
   * Checks the given term against the dictionaries and determines whether its
   * accurate.
   * @param  {String} term The word/term to check
   * @return {Boolean}      True if the word was confirmed by any dictionary, or false.
   */
  check (term: string): boolean {
    // Don't check until all are loaded
    if (global.config.get('selectedDicts').length !== this._typos.length) {
      return true
    }

    // We need to differentiate between not ready and ready, but there are no
    // dictionaries. Because in the latter case, returning true means to let the
    // renderer save the words anyway. Object indexing is still more efficient
    // than querying the main process via IPC.
    if (this._typos.length === 0) {
      return true
    }

    let correct = false
    for (let typo of this._typos) {
      if ((typo as any).correct(term) === true) {
        correct = true
      }
    }

    // Last but not least check the user dictionary
    if (this._userDictionary.includes(term)) {
      correct = true
    }

    return correct
  }

  /**
   * Returns an array of possible suggestions for the given word.
   * @param  {String} term The term or word to check for.
   * @return {Array}      An array containing all returned possible alternatives.
   */
  suggest (term: string): string[] {
    // Return no suggestions
    if (global.config.get('selectedDicts').length !== this._typos.length) {
      return []
    }

    if (this._typos.length === 0) {
      return []
    }

    let suggestions: string[] = []
    for (let typo of this._typos) {
      suggestions = suggestions.concat(typo.suggest(term))
    }

    return suggestions
  }

  /**
   * Adds the given term to the user dictionary
   * @param {String} term The term to add
   */
  add (term: string): boolean {
    term = term.trim()
    if (term === '') {
      return false
    }

    // Adds the given term to the user dictionary
    if (!this._userDictionary.includes(term)) {
      this._userDictionary.push(term)
      // Send an invalidation message to the renderer so that it reloads all words
      broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })

      return true
    }

    return false
  }

  /**
   * Initiates a full reload of the loaded dictionaries.
   * @return {void} Does not return.
   */
  reload (): void {
    if (global.config.get('selectedDicts') === this._loadedDicts) return

    // Reload the dictionary based upon the new selected dictionaries.
    this._load()
      .catch(err => {
        global.log.error(`[Dictionary Provider] Could not (re)load dictionaries: ${err.message as string}`, err)
      })
  }

  /**
   * Get all dictionaries that have been actually loaded.
   * @return {Array} All loaded dicts (precisely: their language codes)
   */
  getDicts (): string[] {
    return this._loadedDicts
  }

  /**
   * Does ZettlrDictionary check for the given language, i.e. did it load?
   * @param  {string} lang The language code, e.g. en_GB
   * @return {Boolean}      True, if the dictionary has been loaded, or false.
   */
  checks (lang: string): boolean {
    return this._loadedDicts.includes(lang)
  }
}
