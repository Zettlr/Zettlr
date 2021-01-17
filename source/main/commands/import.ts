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
import { trans } from '../../common/i18n'
import makeImport from '../modules/import'
import path from 'path'
import { import_files as FORMATS } from '../../common/data.json'

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
    if (this._app.getCurrentDir() === null) {
      global.notify.normal(trans('system.import_no_directory'))
      return false
    }

    // Prepare the list of file filters
    // The "All Files" filter should be at the top
    let fltr = [{ 'name': trans('system.all_files'), 'extensions': ['*'] }]
    for (let f of FORMATS) {
      // The import_files array has the structure "pandoc format" "readable format" "extensions"...
      // Here we set index 1 as readable name and all following elements (without leading dots)
      // as extensions
      fltr.push({ 'name': f[1], 'extensions': f.slice(2) })
    }

    // First ask the user for a fileList
    let fileList = await this._app.askFile(fltr, true)
    if (fileList.length === 0) {
      // The user seems to have decided not to import anything. Gracefully
      // fail. Not like the German SPD.
      return false
    }

    // Now import.
    global.notify.normal(trans('system.import_status'))
    try {
      let ret = await makeImport(fileList, this._app.getCurrentDir(), (file: string, error: any) => {
        // This callback gets called whenever there is an error while running pandoc.
        global.notify.normal(trans('system.import_error', path.basename(file)))
      }, (file: string) => {
        // And this on each success!
        global.notify.normal(trans('system.import_success', path.basename(file)))
      })

      if (ret.length > 0) {
        // Some files failed to import.
        global.notify.normal(trans('system.import_fail', ret.length, ret.map((x) => { return path.basename(x) }).join(', ')))
      }
    } catch (e) {
      // There has been an error on importing (e.g. Pandoc was not found)
      // This catches this and displays it.
      global.log.error(e.message, e)
      global.notify.normal(e.message)
    }

    return true
  }
}
