/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileNew command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new file.
 *
 * END HEADER
 */

const GettlrCommand = require('./Gettlr-command')
const { trans } = require('../../common/lang/i18n')

class FileNew extends GettlrCommand {
  constructor (app) {
    super(app, 'file-new')
  }

  /**
   * Create a new file.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of containing directory and a file name.
   * @return {void}     This function does not return anything.
   */
  run (evt, arg) {
    // This command closes the current file
    if (!this._app.canClose()) return

    let dir

    // There should be also a hash in the argument.
    if (arg.hasOwnProperty('hash')) {
      dir = this._app.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      dir = this._app.getCurrentDir()
    }

    // Create the file
    dir.newfile(arg.name).then((file) => {
      // Send the new paths and open the respective file.
      global.application.dirUpdate(dir.hash, dir.getMetadata())
      this._app.ipc.send('file-open', {
        file: file.withContent(),
        flag: 'new-file' // Indicate this is a new file
      })
      this._app.setCurrentFile(file)
    }).catch((e) => {
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: e.message
      })
    })
  }
}

module.exports = FileNew
