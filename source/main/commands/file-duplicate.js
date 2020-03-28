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
    super(app, 'file-duplicate')
  }

  /**
   * Duplicate a file.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing all necessary information.
   * @return {void}     This function does not return anything.
   */
  run (evt, arg) {
    // This command closes the current file
    if (!this._app.canClose()) return

    // ARG structure: { dir, file, name }
    let dir

    // There should be also a hash in the argument.
    if (arg.hasOwnProperty('dir')) {
      dir = this._app.findDir({ 'hash': parseInt(arg.dir) })
    } else {
      dir = this._app.getCurrentDir()
    }

    // Create the file by duplicating an existing
    dir.duplicate(arg.file, arg.name).then((file) => {
      // Send the new paths and open the respective file.
      global.application.dirUpdate(dir.hash, dir.getMetadata())
      this._app.ipc.send('file-open', file.withContent())
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
