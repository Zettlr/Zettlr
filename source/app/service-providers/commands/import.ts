/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ImportFiles command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command imports files into the app.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '@common/i18n-main'
import makeImport from './importer'
import path from 'path'
import { import_files as FORMATS } from '@common/data.json'
import { showNativeNotification } from '@common/util/show-notification'

export default class ImportFiles extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'import-files')
  }

  /**
    * This function asks the user for a list of files and then imports them.
    * @param {String} evt The event name
    * @param {Object} arg The command arguments.
    * @return {void} Does not return.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    const openDirectory = this._app.fsal.openDirectory
    if (openDirectory === null) {
      showNativeNotification(trans('You have to select a directory to import to.'))
      return false
    }

    // Prepare the list of file filters
    // The "All Files" filter should be at the top
    let fltr = [{ 'name': trans('All Files'), 'extensions': ['*'] }]
    for (let f of FORMATS) {
      // The import_files array has the structure "readable format" "extensions"...
      // Here we set index 1 as readable name and all following elements (without leading dots)
      // as extensions
      fltr.push({ 'name': f[0], 'extensions': f.slice(1) })
    }

    // First ask the user for a fileList
    let fileList = await this._app.windows.askFile(fltr, true)
    if (fileList.length === 0) {
      // The user seems to have decided not to import anything. Gracefully
      // fail. Not like the German SPD.
      return false
    }

    // Now import.
    showNativeNotification(trans('Importing. Please wait …'))
    try {
      let ret = await makeImport(fileList, openDirectory, this._app.assets, (file: string, error: string) => {
        this._app.log.error(`[Importer] Could not import file ${file}: ${error}`)
        // This callback gets called whenever there is an error while running pandoc.
        showNativeNotification(trans('Couldn\'t import %s.', path.basename(file)))
      }, (file: string) => {
        // And this on each success!
        showNativeNotification(trans('%s imported successfully.', path.basename(file)))
      })

      if (ret.length > 0) {
        // Some files failed to import.
        showNativeNotification(trans('The following %s files could not be imported, because their filetype is unknown: %s', ret.length, ret.map((x) => { return path.basename(x) }).join(', ')))
      }
    } catch (err: any) {
      // There has been an error on importing (e.g. Pandoc was not found)
      // This catches this and displays it.
      this._app.log.error(`[Importer] Could not import files: ${String(err.message)}`, err)
      showNativeNotification(trans('The following %s files could not be imported, because their filetype is unknown: %s', fileList.length, ''))
    }

    return true
  }
}
