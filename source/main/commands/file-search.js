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

const GettlrCommand = require('./Gettlr-command')

class FileSearch extends GettlrCommand {
  constructor (app) {
    super(app, 'file-search')
  }

  /**
   * Search a file and return the results to the renderer.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of a file to be searched
   * @return {Boolean}     Whether the call succeeded.
   */
  run (evt, arg) {
    // arg.content contains a hash of the file to be searched
    // and the prepared terms.
    let file = this._app.findFile({ 'hash': arg.hash })
    if (!file) return false // File not found
    this._app.ipc.send('file-search-result', {
      'hash': arg.hash,
      'result': file.search(arg.terms)
    })
    return true
  }
}

module.exports = FileSearch
