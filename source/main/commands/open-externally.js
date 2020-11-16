/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        OpenExternally command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command opens a link (either local or external) outside the Zettlr main Browser window.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const { shell } = require('electron')
const isDir = require('../../common/util/is-dir')
const isFile = require('../../common/util/is-file')

class OpenExternally extends ZettlrCommand {
  constructor (app) {
    super(app, 'open-external')
  }

  /**
    * Open a link externally.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing the href of the link to open
    */
  async run (evt, arg) {
    if (isDir(arg.href) || isFile(arg.href)) {
      try {
        let potentialError = await shell.openPath(arg.href)
        if (potentialError !== '') {
          global.log.error('Could not open attachment:' + potentialError)
          global.notify.normal(`Could not open ${arg.href} externally.`)
        }
      } catch (e) {
        // openPath does not throw according to the logs.
      }
      return
    }

    // Next possibility: Weblink
    try {
      await shell.openExternal(arg.href)
    } catch (e) {
      global.log.error(`Could not open ${arg.href} externally: ${e.message}`, e)
      global.notify.normal(`Could not open ${arg.href} externally.`) // TODO: Translate
    }
  }
}

module.exports = OpenExternally
