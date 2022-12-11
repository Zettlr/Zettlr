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
import enumDictFiles from '@common/util/enum-dict-files'
import enumLangFiles from '@common/util/enum-lang-files'
import ProviderContract from '../provider-contract'
import LogProvider from '../log'
import ConfigProvider from '@providers/config'

export default class TranslationProvider extends ProviderContract {
  private readonly _languageDirectory: string

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider
  ) {
    super()
    this._languageDirectory = path.join(app.getPath('userData'), '/lang/')

    ipcMain.handle('translation-provider', async (event, message) => {
      const { command } = message

      if (command === 'get-available-languages') {
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
