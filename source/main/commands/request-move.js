const ZettlrCommand = require('./zettlr-command')
const path = require('path')
const { trans } = require('../../common/lang/i18n')
const { hash } = require('../../common/zettlr-helpers')

class RequestMove extends ZettlrCommand {
  constructor (app) {
    super(app, 'request-move')
  }

  /**
   * Move a directory around. Or a file.
   * @param  {Object} arg The origin and the destination
   * @return {Boolean}     Whether or not the command succeeded.
   */
  run (arg) {
    // arg contains from and to
    let from = this._app.findDir({ 'hash': parseInt(arg.from) })
    if (from == null) {
      // Obviously a file!
      from = this._app.findFile({ 'hash': parseInt(arg.from) })
    }

    let to = this._app.findDir({ 'hash': parseInt(arg.to) })

    // Let's check that:
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

    // Now check if we've actually gotten a virtual directory
    if (to.isVirtualDirectory() && from.isFile()) {
      // Then simply attach.
      to.attach(from)
      // And, of course, refresh the renderer.
      this._app.ipc.send('paths-update', this._app.getPathDummies())
      return
    }

    let newPath = null

    if (from.isFile() && (this._app.getCurrentFile() != null) && (from.hash === this._app.getCurrentFile().hash)) {
      // Current file is to be moved
      // So move the file and immediately retrieve the new path
      this._app.watchdog.ignoreNext('unlink', from.path)
      this._app.watchdog.ignoreNext('add', path.join(to.path, from.name))
      from.move(to.path)
      to.attach(from)

      // Now our current file has been successfully moved and will
      // save correctly. Problem? The client needs it as well.
      // We have to set current dir (the to-dir) and current file AND
      // select it.
      this._app.setCurrentDir(to) // Current file is still correctly set
      this._app.ipc.send('paths-update', this._app.getPathDummies())
      return
    } else if ((this._app.getCurrentFile() !== null) &&
    (from.findFile({ 'hash': this._app.getCurrentFile().hash }) !== null)) {
      // The current file is in said dir so we need to trick a little bit
      newPath = this._app.getCurrentFile().path
      let relative = newPath.replace(from.path, '') // Remove old directory to get relative path
      // Re-merge:
      newPath = path.join(to.path, from.name, relative) // New path now
      // Hash it
      newPath = hash(newPath)
    }

    if (from.isDirectory()) {
      // TODO: Think of something to ignore _all_ events emanating from
      // the directory (every file will also trigger an unlink/add-couple)
      this._app.watchdog.ignoreNext('unlinkDir', from.path)
      this._app.watchdog.ignoreNext('addDir', path.join(to.path, from.name))
    } else if (from.isFile()) {
      this._app.watchdog.ignoreNext('unlink', from.path)
      this._app.watchdog.ignoreNext('add', path.join(to.path, from.name))
    }

    from.move(to.path)
    // Add directory or file to target dir
    to.attach(from)

    this._app.ipc.send('paths-update', this._app.getPathDummies())

    if (newPath != null) {
      // Find the current file and reset the pointers to it.
      this._app.setCurrentFile(from.findFile({ 'hash': newPath }))
    }

    return true
  }
}

module.exports = RequestMove
