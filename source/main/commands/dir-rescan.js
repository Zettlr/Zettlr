/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRescan command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command checks if a dead directory has been mounted yet.
 *
 * END HEADER
 */

const fs = require('fs')
const GettlrCommand = require('./Gettlr-command')
const GettlrDirectory = require('../Gettlr-dir')
const { trans } = require('../../common/lang/i18n')

class DirRescan extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-rescan')
  }

  /**
    * Exports the current project.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    // We need to find the dir, check if it has been mounted, and then simply
    // replace it with a "full" directory object. Afterwards, a paths update
    // will take care of the renderer being notified of the reload.
    let p = this._app.getPaths()
    for (let i = 0; i < p.length; i++) {
      // We have to loop through the open paths, because otherwise we can't
      // replace the directory.
      if (p[i].hash === parseInt(arg.hash) && p[i].type === 'dead-directory') {
        try {
          fs.lstatSync(p[i].path)
          p[i] = new GettlrDirectory(p[i].parent, p[i].path)
          p[i].scan().then(() => {
            // send path update
            global.ipc.send('paths-update', this._app.getPathDummies())
          })
        } catch (e) {
          global.ipc.notify(trans('system.error.dnf_message'))
          // Do nothing, because the directory has not yet been remounted.
        }
      }
    }
  }
}

module.exports = DirRescan
