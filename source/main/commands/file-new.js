const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')

class FileNew extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-new')
  }

  /**
   * Create a new file.
   * @param  {Object} arg An object containing a hash of containing directory and a file name.
   * @return {void}     This function does not return anything.
   */
  run (arg) {
    // This command closes the current file
    if (!this._app.canClose()) return

    let dir = null
    let file = null

    // There should be also a hash in the argument.
    if (arg.hasOwnProperty('hash')) {
      dir = this._app.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      dir = this._app.getCurrentDir()
    }

    // Create the file
    try {
      file = dir.newfile(arg.name)
    } catch (e) {
      return this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: e.message
      })
    }

    // Send the new paths and open the respective file.
    this._app.ipc.send('paths-update', this._app.getPathDummies())
    this._app.setCurrentFile(file)
    this._app.ipc.send('file-open', file.withContent())
  }
}

module.exports = FileNew
