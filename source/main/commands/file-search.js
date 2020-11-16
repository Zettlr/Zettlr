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

const ZettlrCommand = require('./zettlr-command')

class FileSearch extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-search')
  }

  /**
   * Search a file and return the results to the renderer.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of a file to be searched
   * @return {Boolean}     Whether the call succeeded.
   */
  async run (evt, arg) {
    // arg.content contains a hash of the file to be searched
    // and the prepared terms.
    let file = this._app.findFile(arg.hash)
    if (file === null) {
      global.log.error('Could not search file: File not found.', arg.terms)
      return false // File not found
    }

    try {
      let result = await this._app.getFileSystem().searchFile(file, arg.terms)

      this._app.ipc.send('file-search-result', {
        'hash': arg.hash,
        'result': result
      })
      return true
    } catch (e) {
      global.log.error(`Could not search file ${file.name}: ${e.message}`, e)
      return false
    }
  }
}

module.exports = FileSearch
