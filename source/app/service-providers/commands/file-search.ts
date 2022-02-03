/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileSearch command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command performs a search on a file.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'

export default class FileSearch extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-search')
  }

  /**
   * Search a file and return the results to the renderer.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of a file to be searched
   * @return {Boolean}     Whether the call succeeded.
   */
  async run (evt: string, arg: any): Promise<boolean> {
    // arg.content contains a hash of the file to be searched
    // and the prepared terms.
    let file = this._app.fsal.findFile(arg.path)
    if (file === null) {
      this._app.log.error('Could not search file: File not found.', arg)
      return false // File not found
    }

    try {
      let result = await this._app.fsal.searchFile(file, arg.terms)
      return result
    } catch (e: any) {
      this._app.log.error(`Could not search file ${file.name}: ${e.message as string}`, e)
      return false
    }
  }
}

module.exports = FileSearch
