/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TranslationProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Takes care of translation updates and downloading new ones.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import { app, ipcMain } from 'electron'
import got from 'got'
import { trans } from '@common/i18n-main'
import moment from 'moment'
import enumDictFiles from '@common/util/enum-dict-files'
import enumLangFiles from '@common/util/enum-lang-files'

const TRANSLATION_API_URL = 'https://translate.zettlr.com/api/languages'

interface APIResponse {
  bcp47: string
  completion: number
  updated_at: string
  download_url: string
}

export default class TranslationProvider {
  private _availableLanguages: APIResponse[]
  private readonly _languageDirectory: string

  constructor () {
    global.log.verbose('Translation provider booting up ...')
    this._availableLanguages = [] // Holds all translations able to download
    this._languageDirectory = path.join(app.getPath('userData'), '/lang/')
    // Inject the global provider functions
    global.translations = {
      /**
       * Return a copy of the available languages
       * @return {Array} An array containing online languages available
       */
      getAvailableLanguages: () => {
        return JSON.parse(JSON.stringify(this._availableLanguages))
      }
    }

    this.init().catch((err) => {
      global.log.error(`[Translation Provider] Could not initialize provider: ${String(err.message)}`, err)
    })

    // NOTE: This must be a synchronous event, because it is called from within
    // the trans() function if one of those two objects is not yet set in the
    // renderer. Ergo, we cannot do this asynchronously.
    ipcMain.on('get-translation', (event) => {
      event.returnValue = {
        i18n: global.i18n,
        i18nFallback: global.i18nFallback
      }
    })

    ipcMain.handle('translation-provider', async (event, message) => {
      const { command } = message

      if (command === 'get-supported-languages') {
        return this._availableLanguages
      } else if (command === 'get-available-languages') {
        // NOTE: We have a small inconsistency, because the translation
        // provider has only been used for requesting additional languages
        // thus far. This means we have to now append the provider, but
        // "available" for this provider originally meant "everything
        // that is downloadable".
        return enumLangFiles().map(elem => elem.tag)
      } else if (command === 'get-available-dictionaries') {
        return enumDictFiles().map(elem => elem.tag)
      } else if (command === 'get-translation-metadata') {
        return await this._getTranslationMetadata()
      }
    })
  }

  /**
   * Get an initial load of all available translations
   * @return {Promise} Resolves if everything worked out, rejects otherwise.
   */
  async init (): Promise<void> {
    let response
    try {
      response = await got(TRANSLATION_API_URL, { method: 'GET' })
    } catch (err: any) {
      // Not critical.
      global.log.warning(`[Translation Provider] Could not update translations: ${String(err.code)}`, err)
      return
    }

    // Alright, we only need the body
    response = JSON.parse(response.body)
    this._availableLanguages = response // Let's save the response

    // Now we have all the languages available. We also need the translation
    // metadata.
    let metadata = await this._getTranslationMetadata()

    let toUpdate = [] // Holds all languages that need updates.

    // Now let's go through all languages and check for updates.
    for (let lang of metadata) {
      // Find the appropriate language
      let l = this._availableLanguages.find(elem => elem.bcp47 === lang.bcp47)
      if (l !== undefined) {
        let oldLang = moment(lang.updated_at)
        let newLang = moment(l.updated_at)
        // l is the new language containing a download url
        if (newLang.isAfter(oldLang)) {
          toUpdate.push(l)
        }
      }
    }

    if (toUpdate.length === 0) {
      global.log.info('[Translation Provider] No updates available.')
      return // Nothing to do here!
    }

    const langList = toUpdate.map(elem => trans(`dialog.preferences.app_lang.${elem.bcp47}`)).join(', ')

    global.log.info(`[Translation Provider] Updating translations for ${langList} ...`)

    // At this moment, we should have all languages.
    for (const language of toUpdate) {
      // What we need to do is rather simple: Simply overwrite the corresponding
      // language files in the language subdirectory!
      await this.downloadLanguage(language)
    }

    // Now we are done and can notify the user of all updated translations!
    global.notify.normal(trans('dialog.preferences.translations.updated', langList))
  }

  /**
   * Downloads a given language.
   *
   * @param  {Language}  language A language option containing a bcp47 and a download url.
   */
  async downloadLanguage (language: APIResponse): Promise<void> {
    global.log.info(`[Translation Provider] Downloading ${language.bcp47} ...`)
    let l = await got(language.download_url, { method: 'GET' })
    let file = path.join(this._languageDirectory, language.bcp47 + '.json')
    await fs.writeFile(file, l.body, { encoding: 'utf8' })
    global.log.info(`[Translation Provider] Success: ${language.bcp47} updated.`)
  }

  /**
   * Asynchronous function to retrieve the metadata from all available languages
   * @param  {Array}  [paths=[ __dirname,    path.join(app.getPath('userData'] Paths to be searched for
   * @return {Array}          An array containing the language metadata (keys = bcp-47 tags)
   */
  private async _getTranslationMetadata (paths = [ path.join(app.getPath('userData'), '/lang'), path.join(__dirname, '/lang') ]): Promise<any> {
    let metadata = []

    // First get all translations available
    let files = enumLangFiles(paths).map(elem => elem.path)
    // Now loop through them and extract the metadata section
    for (let f of files) {
      let lang = path.basename(f, path.extname(f)) // bcp-47 tag
      if (metadata.find(elem => elem.bcp47 === lang) !== undefined) {
        continue // Already included
      }

      const data = await fs.readFile(f, 'utf-8')
      const stat = await fs.lstat(f)
      const parsedData = JSON.parse(data)

      if (!('metadata' in parsedData)) {
        // Only the language tag and last file modification date
        metadata.push({
          'bcp47': lang,
          'updated_at': stat.mtime.toISOString()
        })
      } else {
        parsedData.metadata.bcp47 = lang // Add language tag
        // Make sure we have a last updated property.
        if (!('updated_at' in parsedData.metadata)) {
          parsedData.metadata.updated_at = stat.mtime.toISOString()
        }
        metadata.push(parsedData.metadata)
      }
    }

    return metadata
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  shutdown (): boolean {
    global.log.verbose('Translation provider shutting down ...')
    return true
  }
}
