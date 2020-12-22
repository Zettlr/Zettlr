/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Print command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command shows the print window.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { app } from 'electron'
import makeExport from '../modules/export'

export default class Print extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'print')
  }

  /**
   * Prints the current file (in: opening the print window)
   * @param {String} evt The event name
   * @param {Object} arg The argument
   * @return {Boolean} Whether the command ran successful
   */
  async run (evt: string, arg: any): Promise<void> {
    if (!arg || !arg.hash) {
      global.log.error('Could not produce print preview: No file hash given.')
      return
    }

    // First we need to export the current file as HTML.
    let file = await global.application.getFile(global.application.findFile(arg.hash))
    if (!file) return // No file open.

    let opt = {
      'format': 'html',
      'file': file, // The file to be exported
      'dest': app.getPath('temp'), // Export to temporary directory
      'stripIDs': global.config.get('export.stripIDs'),
      'stripTags': global.config.get('export.stripTags'),
      'stripLinks': global.config.get('export.stripLinks'),
      'title': file.name.substr(0, file.name.lastIndexOf('.')),
      'author': global.config.get('pdf').author,
      'autoOpen': false, // Do not automatically open the file after export
      'absoluteImagePaths': true // Explicitly request absolute image paths
    }

    // Call the exporter.
    try {
      const target = await makeExport(opt)
      // Now we'll need to open the print window.
      this._app.showPrintWindow(target)
    } catch (err) {
      global.notify.normal(`${err.name as string}: ${err.message as string}`)
    }
  }
}
