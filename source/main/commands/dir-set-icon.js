/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirSetIcon command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Sets the icon of a directory in its settings.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

module.exports = class DirSetIcon extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-set-icon')
  }

  /**
    * Sets the icon for a directory
    * @param {String} evt The event name
    * @param  {Object} arg An object containing both a hash and an icon
    */
  async run (evt, arg) {
    let dir = this._app.findDir(arg.hash)
    if (dir === null) return false

    console.log('Setting directory icon', arg.icon)

    await this._app.getFileSystem().setDirectorySetting(dir, { 'icon': arg.icon })
  }
}
