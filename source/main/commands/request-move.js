/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RequestMove command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command moves a file or directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')

class RequestMove extends ZettlrCommand {
  constructor (app) {
    super(app, 'request-move')
  }

  /**
   * Move a directory around. Or a file.
   * @param {String} evt The event name
   * @param  {Object} arg The origin and the destination
   * @return {Boolean}     Whether or not the command succeeded.
   */
  async run (evt, arg) {
    // arg contains from and to. Prepare the necessary variables
    let from = this._app.findDir(arg.from)
    // Obviously a file!
    if (from == null) from = this._app.findFile(arg.from)
    let to = this._app.findDir(arg.to)
    let fsal = this._app.getFileSystem() // We need this quite often here

    if (to === null) {
      // If findDir doesn't return anything then it's a file
      global.log.error('Could not find the target directory for moving.')
      return
    }

    // Let's check if the destination is a child of the source:
    if (fsal.findFile(to, [from]) || fsal.findDir(to, [from])) {
      return this._app.window.prompt({
        type: 'error',
        title: trans('system.error.move_into_child_title'),
        message: trans('system.error.move_into_child_message')
      })
    }

    // Now check if there already is a directory/file with the same name
    if (fsal.hasChild(to, from)) {
      return this._app.window.prompt({
        type: 'error',
        title: trans('system.error.already_exists_title'),
        message: trans('system.error.already_exists_message', from.name)
      })
    }

    // Now we can move the source to the target.
    await fsal.move(from, to)
    return true
  }
}

module.exports = RequestMove
