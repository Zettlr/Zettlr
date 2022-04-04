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
import { provideConfigToI18NMain, trans } from '@common/i18n-main'
import moment from 'moment'
import enumDictFiles from '@common/util/enum-dict-files'
import enumLangFiles from '@common/util/enum-lang-files'
import ProviderContract from '../provider-contract'
import getLanguageFile from '@common/util/get-language-file'
import LogProvider from '../log'

const TRANSLATION_API_URL = 'https://translate.zettlr.com/api/languages'

interface APIResponse {
  bcp47: string
  completion: number
  updated_at: string
  download_url: string
}

export default class TranslationProvider extends ProviderContract {
  private _availableLanguages: APIResponse[]
  private readonly _languageDirectory: string

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider
  ) {
    super()
    this._availableLanguages = [] // Holds all translations able to download
    this._languageDirectory = path.join(app.getPath('userData'), '/lang/')

    // Since we still have side effects in the main process, we have to inject
    // the config provider into that module kind of hacky
    provideConfigToI18NMain(this._config)

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
   *
   */
  async boot (): Promise<void> {
    this._logger.verbose('Translation provider booting up ...')
    // First and foremost, load the translation strings
    const file = getLanguageFile(this._config.get('appLang'))

    // It may be that only a fallback has been provided or else. In this case we
    // must update the config to reflect this.
    if (file.tag !== this._config.get('appLang')) {
      this._config.set('appLang', file.tag)
    }

    // Cannot do this asynchronously, because it HAS to be loaded directly
    // after the config and written into the global object
    global.i18nRawData = await fs.readFile(file.path, 'utf8')
    global.i18n = JSON.parse(global.i18nRawData)

    // Also load the en-US fallback as we can be sure this WILL both stay
    // up to date and will be understood by most people.
    const fallback = getLanguageFile('en-US') // Will return either the shipped or updated file
    global.i18nFallbackRawData = await fs.readFile(fallback.path, 'utf8')
    global.i18nFallback = JSON.parse(global.i18nFallbackRawData)

    // Get user's setting of translation updates
    const checkForTranslationUpdates: boolean = this._config.get('system.checkForTranslationUpdates')
    if (checkForTranslationUpdates) {
      this.updateTranslations().catch(err => this._logger.error(`[Translation Provider] Failed to update translations: ${String(err.code)}`, err))
    } else {
      this._logger.info('[Translation Provider] Not checking for translation updates based on preferences.')
    }
  }

  /**
   * Get translation updates via translation server
   * @return {Promise} Resolves if everything worked out, rejects otherwise.
   */
  async updateTranslations (): Promise<void> {
    // return file
    let response
    try {
      response = await got(TRANSLATION_API_URL, { method: 'GET' })
    } catch (err: any) {
      // Not critical.
      this._logger.warning(`[Translation Provider] Could not update translations: ${String(err.code)}`, err)
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
      this._logger.info('[Translation Provider] No updates available.')
      return // Nothing to do here!
    }

    const langList = toUpdate.map(elem => trans(`dialog.preferences.app_lang.${elem.bcp47}`)).join(', ')

    this._logger.info(`[Translation Provider] Updating translations for ${langList} ...`)

    // At this moment, we should have all languages.
    // NOTE: We're collecting the promises and do not await them here, so that
    // the app starts faster, especially for slow connections.
    const allPromises: Array<Promise<void>> = []
    for (const language of toUpdate) {
      // What we need to do is rather simple: Simply overwrite the corresponding
      // language files in the language subdirectory!
      allPromises.push(this.downloadLanguage(language))
    }

    Promise.all(allPromises)
      .then(() => {
        // Now we are done and can notify the user of all updated translations!
        this._logger.info(trans('dialog.preferences.translations.updated', langList))
      })
      .catch((err) => {
        this._logger.error(`Could not update language: ${err.message as string}`, err)
      })
  }

  /**
   * Downloads a given language.
   *
   * @param  {Language}  language A language option containing a bcp47 and a download url.
   */
  async downloadLanguage (language: APIResponse): Promise<void> {
    this._logger.info(`[Translation Provider] Downloading ${language.bcp47} ...`)
    let l = await got(language.download_url, { method: 'GET' })
    let file = path.join(this._languageDirectory, language.bcp47 + '.json')
    await fs.writeFile(file, l.body, { encoding: 'utf8' })
    this._logger.info(`[Translation Provider] Success: ${language.bcp47} updated.`)
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
  async shutdown (): Promise<void> {
    this._logger.verbose('Translation provider shutting down ...')
  }
}
