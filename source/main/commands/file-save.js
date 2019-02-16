// This command saves an image from clipboard

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')

class SaveFile extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-save')
  }

  /**
    * Saves a file. A file MUST be given, for the content is needed to write to
    * a file. Content is always freshly grabbed from the CodeMirror content.
    * @param  {Object} file An object containing some properties of the file.
    * @return {void}      This function does not return.
    */
  run (file) {
    if ((file == null) || !file.hasOwnProperty('content')) {
      // No file given -> abort saving process
      return false
    }

    let cnt = file.content

    // It may be that we have to create a file. In this case, a paths update is
    // necessary, which must be sent after this function's run.
    let pathsUpdateNecessary = false

    // Update word count
    this._app.stats.updateWordCount(file.wordcount || 0)

    // This function saves a file to disk.
    // But: The hash is "null", if someone just
    // started typing with no file open.
    if (!file.hasOwnProperty('hash') || file.hash == null) {
      // For ease create a new file in current directory.
      if (this._app.getCurrentDir() == null) {
        switch (this._app.window.askSaveChanges()) {
          case 2: // Omit changes
            // Mark clean and force-close
            this._app.ipc.send('file-close', {})
            this._app.clearModified()
            break
          case 1: // Save changes
          case 0: // cancel
            // Abort saving process to let the user choose a dir
            this._app.notify(trans('system.save_changes_select_dir'))
            break
        }
        return false
      }
      file = this._app.getCurrentDir().newfile(null)
      pathsUpdateNecessary = true
    } else {
      let f = this._app.getCurrentFile()
      if (f == null) {
        return this._app.window.prompt({
          type: 'error',
          title: trans('system.error.fnf_title'),
          message: trans('system.error.fnf_message')
        })
      }
      file = f
    }

    // Ignore the next change for this specific file
    this._app.watchdog.ignoreNext('change', file.path)
    file.save(cnt)
    this._app.clearModified()

    // Now it can be that a paths update is necessary. We have to send the
    // update instead of the file-update to make sure the correct file is in
    // the renderer.
    if (pathsUpdateNecessary) {
      this._app.ipc.send('paths-update', this._app.getPathDummies())
    } else {
      // Immediately update the paths in renderer so that it is able to find
      // the file to (re)-select it.
      this._app.ipc.send('file-update', file.getMetadata())
    }

    // Switch to newly created file (only happens before a file is selected)
    if (this._app.getCurrentFile() == null) {
      this._app.setCurrentFile(file)
      // "Open" this file.
      this._app.sendFile(file.hash)
    }
  }
}

module.exports = SaveFile
