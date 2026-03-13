/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DictionaryProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file loads the dictionaries on instantiation and
 *                  provides functions to check misspelled words.
 *
 * END HEADER
 */

import EventEmitter from 'events'
// NOTE: We have to include the compiled Nodehun.node library directly, because
// webpack, the asset relocator, forge, or all of them at once will otherwise be
// unable to detect that Nodehun is not a Javascript, but a native module,
// because the dylib is referenced directly in the package.json -- but without
// a file extension.
import Nodehun from 'nodehun/build/Release/Nodehun.node'
// import { Nodehun } from 'nodehun'
import path from 'path'
import { promises as fs } from 'fs'

import { ipcMain, app, shell } from 'electron'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import findLangCandidates, { type Candidate } from '@common/util/find-lang-candidates'
import enumDictFiles, { type DictFileMetadata } from '@common/util/enum-dict-files'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'

export interface DictionaryRecord { word: string, affix?: string }

const hunspellRe = /^(?<word>(?:(?:\\.|[^/])(?!\w{2}:))*)(?<flags>.*)$/

/**
 * This class loads and unloads dictionaries according to the configuration set
 * by the user on runtime. It provides functions that allow to search all
 * loaded dictionaries for words and even change the dictionaries during runtime.
 */
export default class DictionaryProvider extends ProviderContract {
  private readonly hunspell: Nodehun[]
  private readonly _loadedDicts: string[]
  private readonly _userDictionaryPath: string
  private readonly _emitter: EventEmitter
  private _userDictionary: DictionaryRecord[]
  private _fileLock: boolean
  private _unwrittenChanges: boolean
  private _cachedAutocorrect: string[]
  private _reloadWanted: boolean
  private _reloadLock: boolean

  constructor (private readonly _logger: LogProvider, private readonly _config: ConfigProvider) {
    super()
    // Array containing all loaded Hunspell dictionaries
    this.hunspell = []
    // Array containing the language codes for which checking currently works
    this._loadedDicts = []
    // Path to the user dictionary
    this._userDictionaryPath = path.join(app.getPath('userData'), 'user.dic')
    // The user dictionary
    this._userDictionary = [{ word: 'Zettlr' }]

    this._cachedAutocorrect = []

    this._emitter = new EventEmitter()

    // If this flag is set, this indicates that a reload is wanted
    this._reloadWanted = false
    this._reloadLock = false // True during reload

    // Flags for writing the file
    this._fileLock = false
    this._unwrittenChanges = false

    ipcMain.handle('dictionary-provider', async (event, message) => {
      const terms: string[] = message.terms
      const { command } = message
      if (command === 'get-user-dictionary') {
        return [...this._userDictionary]
      } else if (command === 'set-user-dictionary') {
        const dict = message.payload as DictionaryRecord[]
        if (!Array.isArray(dict) || !dict.every(d => 'word' in d)) {
          throw new Error('[Dictionary Provider] Cannot set user dictionary: Argument was not a string array.')
        }
        await this.setUserDictionary(dict)
      } else if (command === 'check') {
        return Promise.all(terms.map(t => this.check(t)))
      } else if (command === 'suggest') {
        const limit: number = message.limit
        return Promise.all(terms.map(t => this.suggest(t, limit)))
      } else if (command === 'add') {
        return Promise.all(terms.map(t => this.add(t)))
      } else if (command === 'ignore') {
        return Promise.all(terms.map(t => this.ignore(t)))
      } else if (command === 'remove') {
        return Promise.all(terms.map(t => this.remove(t)))
      } else if (command === 'open-dictionary-folder') {
        shell.showItemInFolder(path.join(app.getPath('userData'), '/dict'))
      }
    })

    // Reload as soon as the config has been updated
    this._config.on('update', (opt: string) => {
      // Reload the dictionaries (if applicable) ...
      if (opt !== 'selectedDicts') {
        return
      }

      this.synchronizeHunspellDictionaries()
        .catch(err => {
          this._logger.error(`[Dictionary Provider] Could not (re)load dictionaries: ${err.message as string}`, err)
        })
      // ... and add cache the autocorrect replacements so they are not seen as "wrong"
      this._cacheAutoCorrectValues()
    })
  }

  async boot (): Promise<void> {
    this._logger.verbose('Dictionary provider booting up ...')
    await this.synchronizeHunspellDictionaries()
    this._cacheAutoCorrectValues()
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Dictionary provider shutting down ...')
    await this.persistUserDictionary()
  }

  /**
   * Removes hunspell flags from the word list
   *
   * @param words
   * @returns
   */
  sanitizeDictionary (words: string[]): DictionaryRecord[] {
    return words
      // Strip flags and optional data fields
      .map(word => {
        const record: DictionaryRecord = { word: '', affix: undefined }

        const match = hunspellRe.exec(word)
        if (match?.groups) {
          record.word = match?.groups.word
          record.affix = match?.groups.flags
        }

        return record
      })
      .filter(record => record.word)
  }

  /**
     * Replaces the current user dictionary with a new one
     * @param {Array} dict The new dictionary.
     * @return {Boolean} Whether or not the call succeeded.
     */
  async setUserDictionary (dict: DictionaryRecord[]): Promise<boolean> {
    if (!Array.isArray(dict)) {
      return false
    }

    const newDictionary = dict.filter(elem => elem.word.trim() !== '')
    const oldDictionary = this._userDictionary

    const addedWords = newDictionary.filter(x => !this._userDictionary.find(elem => elem.word === x.word))
    const removedWords = oldDictionary.filter(x => !newDictionary.find(elem => elem.word === x.word))

    for (const rec of addedWords) {
      await this.add(rec.word, rec.affix)
    }

    for (const rec of removedWords) {
      await this.remove(rec.word)
    }

    return true
  }

  /**
   * Caches the autocorrect replacement table in order to mark the replacements
   * as correct.
   */
  _cacheAutoCorrectValues (): void {
    const table = this._config.get().editor.autoCorrect.replacements
    this._cachedAutocorrect = table.map(x => x.value)
  }

  /**
 * Returns metadata for a given dictionary dir and provides a status code.
 * @param  {string} query         The language metadata is requested for (BCP 47 compatible)
 * @return {Object}               A language metadata object.
 */
  private _getDictionaryFile (query: string): Candidate & DictFileMetadata {
    // First of all, create the fallback object.
    const fallback: Candidate & DictFileMetadata = {
      tag: 'en-US',
      status: 'fallback',
      aff: path.join(__dirname, 'dict/en-US/en-US.aff'),
      dic: path.join(__dirname, 'dict/en-US/en-US.dic')
    }

    // Now we should have a list of all available dictionaries. Next, we need to
    // search for a best and a close match.
    const { exact, close } = findLangCandidates(query, enumDictFiles())

    if (exact !== undefined) {
      return exact
    } else if (close !== undefined) {
      return close
    } else {
      return fallback
    }
  }

  /**
   * (Re)Loads the dictionaries efficiently based upon the selected dictionaries
   * @return {Promise} Does not throw, as we catch errors.
   */
  async synchronizeHunspellDictionaries (): Promise<void> {
    if (this._reloadLock) {
      // Another reload is wanted
      this._reloadWanted = true
      return
    }

    this._reloadWanted = false
    this._reloadLock = true

    const { selectedDicts } = this._config.get()
    let dictsToLoad = []

    let changeWanted = false

    const userDic = await this.loadUserDictionary()
    if (userDic === undefined) {
      this._loadedDicts.splice(0)
      this.hunspell.splice(0)
      changeWanted = true
    }

    // This function can also be called during runtime to exchange some dicts,
    // so make sure we don't reload these monstrous things all too often.
    // 1. Which dicts do we have to load?
    for (let dict of selectedDicts) {
      if (!this._loadedDicts.includes(dict)) {
        dictsToLoad.push(dict)
        changeWanted = true
      }
    }

    // 2. Which of the already loaded dicts can be trashed?
    for (let dict of this._loadedDicts) {
      if (!selectedDicts.includes(dict)) {
        let index = this._loadedDicts.indexOf(dict)
        this._loadedDicts.splice(index, 1) // Remove both from the loadedDicts...
        this.hunspell.splice(index, 1) // ... and the typos themselves
        changeWanted = true
      }
    }

    for (const dict of dictsToLoad) {
      // First request a dictionary.
      const dictMeta = this._getDictionaryFile(dict)
      if (dictMeta.status !== 'exact') {
        this._logger.error(`[Dictionary Provider] Could not load ${dict}: No exact match found.`, dictMeta)
        continue // Only consider exact matches
      }

      let aff: null|Buffer = null
      let dic: null|Buffer = null

      try {
        aff = await fs.readFile(dictMeta.aff)
      } catch (err: unknown) {
        this._logger.error(`[Dictionary Provider] Could not load affix file for ${dict}`, err)
        continue
      }

      try {
        dic = await fs.readFile(dictMeta.dic)
      } catch (err: unknown) {
        this._logger.error(`[Dictionary Provider] Could not load .dic file for ${dict}`, err)
        continue
      }

      try {
        const hun = new Nodehun(aff, dic)
        if (userDic !== undefined) {
          await hun.addDictionary(userDic)
        }

        this.hunspell.push(hun)
        this._loadedDicts.push(dict)
      } catch (err: unknown) {
        this._logger.error(`[Dictionary Provider] Could not load hunspell dictionary ${dict}`, err)
        continue
      }
    }

    if (changeWanted) {
      // Don't be noisy: Only emit if necessary
      // Finally emit the update event
      this._emitter.emit('update', this._loadedDicts)
      this._logger.info(`[Dictionary Provider] Loaded dictionaries: ${this._loadedDicts.join(', ')}`)

      // Send an invalidation message to the renderer
      broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })
    }

    this._reloadLock = false
    if (this._reloadWanted) {
      await this.synchronizeHunspellDictionaries()
    }
  }

  /**
   * Loads the user dictionary from file.
   * @return {Promise} Will resolve after the dictionary has been loaded.
   */
  async loadUserDictionary (): Promise<Buffer<ArrayBufferLike>|undefined> {
    try {
      await fs.lstat(this._userDictionaryPath)
    } catch (err) {
      // Create a new file and add the current user dictionary to it
      await this.persistUserDictionary()
    }

    try {
      const dic = await fs.readFile(this._userDictionaryPath)

      const fileContents = dic.toString('utf-8')
        .split('\n')
        .filter((elem, index) => index > 0 ? elem.trim() !== '' : !/\d/.test(elem))

      const dictionary = new Set(fileContents)
      const prevUserDic = new Set(this._userDictionary.map(record => record.word + (record.affix ?? '')))

      this._logger.info(`[Dictionary Provider] Loaded the user dictionary: ${this._userDictionaryPath}`)

      // The dictionary did not change
      if (dictionary.symmetricDifference(prevUserDic).size === 0) {
        return
      }

      this._userDictionary = this.sanitizeDictionary([...dictionary])

      return dic
    } catch (err: unknown) {
      this._logger.error(`[Dictionary Provider] Could not load the user dictionary: ${this._userDictionaryPath}`, err)
      return
    }
  }

  /**
   * Persists the user dictionary to disk
   */
  private async persistUserDictionary (): Promise<void> {
    if (this._fileLock) {
      // If there is a file lock, set the changes flag and abort
      this._unwrittenChanges = true
      return
    }

    // Initiate the filelock, write, release the lock
    const data = this._userDictionary
      .map(elem => elem.word + (elem.affix !== undefined ? elem.affix : ''))
      .join('\n')

    // The first line has to contain an approximate number of terms in the dictionary.
    const fileContents = this._userDictionary.length + '\n' + data
    this._fileLock = true
    this._unwrittenChanges = false // NOTE that this has to come before the writing
    await fs.writeFile(this._userDictionaryPath, fileContents)
    this._fileLock = false

    // After we're done, check if someone tried to call the function in the
    // meantime. If so, the flag will be true by now: immediately call it again.
    if (this._unwrittenChanges) {
      return await this.persistUserDictionary()
    }
  }

  /**
   * Checks the given term against the dictionaries and determines whether its
   * accurate.
   * @param  {String} term The word/term to check
   * @return {Boolean}      True if the word was confirmed by any dictionary, or false.
   */
  async check (term: string): Promise<boolean> {
    // Don't check until all are loaded
    if (this._config.get().selectedDicts.length !== this.hunspell.length) {
      return true
    }

    // We need to differentiate between not ready and ready, but there are no
    // dictionaries. Because in the latter case, returning true means to let the
    // renderer save the words anyway. Object indexing is still more efficient
    // than querying the main process via IPC.
    if (this.hunspell.length === 0) {
      return true
    }

    // First, check the small tables: user dictionary and replacement table
    if (this._cachedAutocorrect.includes(term)) {
      return true
    }

    for (const dictionary of this.hunspell) {
      if (await dictionary.spell(term)) {
        return true
      }
    }

    return false
  }

  /**
   * Returns an array of possible suggestions for the given word.
   * @param  {String} term  The term or word to check for.
   * @param  {number} limit Limit the number of suggestions per dictionary to this number
   * @return {Array}      An array containing all returned possible alternatives.
   */
  async suggest (term: string, limit?: number): Promise<string[] >{
    const suggestions: string[] = []

    // Wait for all dictionaries to load.
    if (this._config.get().selectedDicts.length !== this.hunspell.length) {
      return suggestions
    }

    if (this.hunspell.length === 0) {
      return suggestions
    }

    for (const dictionary of this.hunspell) {
      const values = await dictionary.suggest(term) ?? []
      suggestions.push(...values.slice(0, limit))
    }

    return [...new Set(suggestions)]
  }

  /**
   * Adds the given term to the user dictionary
   * @param {String} term The term to add
   */
  async add (term: string, affix?: string): Promise<boolean> {
    term = term.trim()
    if (term === '') {
      return false
    }

    // Adds the given term to the user dictionary
    if (!this._userDictionary.find(elem => elem.word === term)) {
      this._userDictionary.push({ word: term, affix })
      this.persistUserDictionary()
        .catch(err => {
          this._logger.error(`[Dictionary Provider] Could not persist user dictionary: ${String(err.message)}`, err)
        })

      for (const dictionary of this.hunspell) {
        await dictionary.add(term)
      }

      // Send an invalidation message to the renderer so that it reloads all words
      broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })

      return true
    }

    return false
  }

  /**
   * Adds the given term to the runtime dictionary
   *
   * @param {String} term The term to add
   */
  async ignore (term: string): Promise<boolean> {
    term = term.trim()
    if (term === '') {
      return false
    }

    // Adds the given term to the user dictionary
    if (!this._userDictionary.find(elem => elem.word === term)) {
      for (const dictionary of this.hunspell) {
        await dictionary.add(term)
      }

      // Send an invalidation message to the renderer so that it reloads all words
      broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })

      return true
    }

    return false
  }

  /**
   * Remove the given term from the user dictionary
   * @param {String} term The term to remove
   */
  async remove (term: string): Promise<boolean> {
    term = term.trim()
    if (term === '') {
      return false
    }

    const elem = this._userDictionary.find(elem => elem.word === term)
    if (elem) {
      const idx = this._userDictionary.indexOf(elem)

      this._userDictionary.splice(idx, 1)
      this.persistUserDictionary()
        .catch(err => {
          this._logger.error(`[Dictionary Provider] Could not persist user dictionary: ${String(err.message)}`, err)
        })

      for (const dictionary of this.hunspell) {
        await dictionary.remove(term)
      }

      // Send an invalidation message to the renderer so that it reloads all words
      broadcastIpcMessage('dictionary-provider', { command: 'invalidate-dict' })

      return true
    }

    return false
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
