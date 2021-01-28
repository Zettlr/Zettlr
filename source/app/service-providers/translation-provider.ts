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
import { enumLangFiles, getTranslationMetadata, trans } from '../../common/i18n.js'
import moment from 'moment'
import { translation_api_url as TRANSLATION_API_URL } from '../../common/data.json'

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

    // NOTE: Possible race condition: If this provider is in the future being
    // loaded AFTER the translations are loaded, this will return undefined,
    // as both global.i18n and global.u18nFallback will not yet be set.
    // loadi18nMain therefore has to be called BEFORE any browser window may
    // request a translation.
    ipcMain.on('get-translation', (event) => {
      event.returnValue = {
        i18n: global.i18n,
        i18nFallback: global.i18nFallback
      }
    })

    ipcMain.handle('translation-provider', (event, message) => {
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
    } catch (err) {
      // Not critical.
      global.log.warning(`[Translation Provider] Could not update translations: ${String(err.code)}`, err)
      return
    }

    // Alright, we only need the body
    response = JSON.parse(response.body)
    this._availableLanguages = response // Let's save the response

    // Now we have all the languages available. We also need the translation
    // metadata.
    let metadata = getTranslationMetadata()

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
      return // Nothing to do here!
    }

    // At this moment, we should have all languages.
    for (let language of toUpdate) {
      // What we need to do is rather simple: Simply overwrite the corresponding
      // language files in the language subdirectory!
      await this.downloadLanguage(language)
    }

    // Now we are done and can notify the user of all updated translations!
    global.notify.normal(
      trans(
        'dialog.preferences.translations.updated',
        toUpdate.map(elem => trans(`dialog.preferences.app_lang.${elem.bcp47}`)).join(', ')
      ),
      true // Show the notification on OS level
    )
  }

  /**
   * Downloads a given language.
   *
   * @param  {Language}  language A language option containing a bcp47 and a download url.
   */
  async downloadLanguage (language: APIResponse): Promise<void> {
    let l = await got(language.download_url, { method: 'GET' })
    let file = path.join(this._languageDirectory, language.bcp47 + '.json')
    await fs.writeFile(file, l.body, { encoding: 'utf8' })
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
