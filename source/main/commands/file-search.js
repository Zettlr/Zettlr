const ZettlrCommand = require('./zettlr-command')

class FileSearch extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-search')
  }

  /**
   * Search a file and return the results to the renderer.
   * @param  {Object} arg An object containing a hash of a file to be searched
   * @return {Boolean}     Whether the call succeeded.
   */
  run (arg) {
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
