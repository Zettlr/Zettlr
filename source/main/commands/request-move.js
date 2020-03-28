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

const GettlrCommand = require('./Gettlr-command')
const path = require('path')
const { trans } = require('../../common/lang/i18n')

class RequestMove extends GettlrCommand {
  constructor (app) {
    super(app, 'request-move')
  }

  /**
   * Move a directory around. Or a file.
   * @param {String} evt The event name
   * @param  {Object} arg The origin and the destination
   * @return {Boolean}     Whether or not the command succeeded.
   */
  run (evt, arg) {
    // arg contains from and to
    let from = this._app.findDir({ 'hash': parseInt(arg.from) })
    if (from == null) {
      // Obviously a file!
      from = this._app.findFile({ 'hash': parseInt(arg.from) })
    }

    let to = this._app.findDir({ 'hash': parseInt(arg.to) })

    if (!to) {
      // If findDir doesn't return anything then it's a file
      global.log.warning('Cannot move anything into a file!')
      return
    }

    // Let's check if the destination is a children of the source:
    if (from.contains(to)) {
      return this._app.window.prompt({
        type: 'error',
        title: trans('system.error.move_into_child_title'),
        message: trans('system.error.move_into_child_message')
      })
    }

    // Now check if there already is a directory/file with the same name
    if (to.hasChild({ 'name': from.name })) {
      return this._app.window.prompt({
        type: 'error',
        title: trans('system.error.already_exists_title'),
        message: trans('system.error.already_exists_message', from.name)
      })
    }

    let oldDirectory = from.parent

    // Now check if we've actually gotten a virtual directory
    if (to.isVirtualDirectory() && from.isFile()) {
      // Then simply attach.
      to.attach(from)
      // And, of course, refresh the renderer.
      global.application.dirUpdate(to.hash, to.getMetadata())
      return true
    }

    let newPath

    if (from === this._app.getCurrentFile()) {
      // Current file is to be moved
      // So move the file and immediately retrieve the new path
      global.watchdog.ignoreNext('add', path.join(to.path, from.name))
      from.move(to.path).then(() => {
        to.attach(from)
        // Re-set the current file to send the correct new hash to the renderer
        global.application.dirUpdate(to.hash, to.getMetadata())
        this._app.setCurrentFile(from)
      })
      return true
    } else if (from.contains(this._app.getCurrentFile())) {
      // The current file is in said dir so we need to trick a little bit
      newPath = this._app.getCurrentFile().path
      let relative = newPath.replace(from.path, '') // Remove old directory to get relative path
      // Re-merge:
      newPath = path.join(to.path, from.name, relative) // New path now
    }

    if (from.isDirectory()) {
      // All events that pertain to files within that directory will not
      // be handled as the directory has already changed by the time they
      // arrive.
      global.watchdog.ignoreNext('unlinkDir', from.path)
      global.watchdog.ignoreNext('addDir', path.join(to.path, from.name))
    } else if (from.isFile()) {
      global.watchdog.ignoreNext('unlink', from.path)
      global.watchdog.ignoreNext('add', path.join(to.path, from.name))
    }

    from.move(to.path).then(() => {
      // Add directory or file to target dir
      to.attach(from)

      // Now replace from and to
      global.application.dirUpdate(to.hash, to.getMetadata())
      global.application.dirUpdate(oldDirectory.hash, oldDirectory.getMetadata())
      // this._app.ipc.send('paths-update', this._app.getPathDummies())

      if (newPath) {
        // Find the current file and reset the pointers to it.
        this._app.setCurrentFile(from.findFile({ 'path': newPath }))
      }

      if (from === this._app.getCurrentDir()) {
        this._app.setCurrentDir(from) // Re-Set to re-engage the hashes
      }
    })

    return true
  }
}

module.exports = RequestMove
