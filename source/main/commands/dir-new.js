/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirNew command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new directory.
 *
 * END HEADER
 */

const GettlrCommand = require('./Gettlr-command')
const { trans } = require('../../common/lang/i18n')

class DirNew extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-new')
  }

  /**
    * Create a new directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  run (evt, arg) {
    let curdir = null

    if (arg.hasOwnProperty('hash')) {
      curdir = this._app.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      curdir = this._app.getCurrentDir()
    }

    curdir.newdir(arg.name).then((dir) => {
      // Re-render the directories, and then as well the file-list of the
      // current folder.
      global.application.dirUpdate(curdir.hash, curdir.getMetadata())

      // Switch to newly created directory.
      this._app.setCurrentDir(dir)
    }).catch((err) => {
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_dir'),
        message: err.message
      })
    })
  }
}

module.exports = DirNew
