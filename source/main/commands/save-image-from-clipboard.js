/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SaveImage command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command saves an image from clipboard.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')
const sanitize = require('sanitize-filename')
const path = require('path')
const fs = require('fs')
const { clipboard } = require('electron')
const isDir = require('../../common/util/is-dir')

class SaveImage extends ZettlrCommand {
  constructor (app) {
    super(app, 'save-image-from-clipboard')
  }

  /**
   * Saves the image that is currently in the clipboard to file and sends an
   * insert command to the renderer, telling it to link the image.
   * @param {String} evt The event name
   * @param  {Object} target Options on the image
   * @return {void}        Does not return.
   */
  async run (evt, target) {
    // First check the name for sanity
    target.name = sanitize(target.name, '-')
    if (target.name === '') {
      return global.ipc.notify(trans('system.error.no_allowed_chars'))
    }

    // A file must be opened and active
    if (!this._app.getFileSystem().getActiveFile()) return global.ipc.notify(trans('system.error.fnf_message'))

    // Now check the extension of the name (some users may
    // prefer to choose to provide it already)
    if (path.extname(target.name) !== '.png') target.name += '.png'

    // Do we store the image to a relative path?
    let isCwd = (target.mode === 'save-cwd')
    let activeFile = this._app.getFileSystem().findFile(this._app.getFileSystem().getActiveFile())
    let currentFilePath = path.dirname(activeFile.path)

    console.log('Preparing to save: ' + activeFile.name + '; filepath: ' + currentFilePath)

    // Preset the default CWD path
    let defaultPath = global.config.get('editor.defaultSaveImagePath') || ''

    // Set default path to current file's dir, if the config path is empty.
    if (isCwd && defaultPath.trim() === '') {
      defaultPath = currentFilePath
    }

    // Did the user want to choose the directory for this one? Then let's ask him!
    if (target.mode === 'save-other') {
      let dirs = await this._app.getWindow().askDir()
      defaultPath = dirs.filePaths[0] // We only take one directory
    }

    if (!path.isAbsolute(defaultPath)) {
      // Resolve the path to an absolute one
      defaultPath = path.resolve(currentFilePath, defaultPath)
    }

    // Now we need to make sure the directory exists.
    try {
      fs.lstatSync(defaultPath)
    } catch (e) {
      fs.mkdirSync(defaultPath, { recursive: true })
    }

    // If something went wrong or the user did not provide a directory, abort
    if (!isDir(defaultPath)) return global.ipc.notify(trans('system.error.dnf_message'))

    // Build the correct path
    let imagePath = path.join(defaultPath, target.name)

    console.log('Saving image as: ' + imagePath)

    // And now save the image
    let image = clipboard.readImage()

    // Somebody may have remotely overwritten the clipboard in the meantime
    if (image.isEmpty()) return global.ipc.notify(trans('system.error.could_not_save_image'))

    // A final step: It may be that the user wanted to resize the image (b/c
    // it's too large or so). In this case, there are width and height
    // properties provided in target.
    if (parseInt(target.width) > 0 && parseInt(target.height) > 0) {
      // The resize function requires real integers
      image = image.resize({
        'width': parseInt(target.width),
        'height': parseInt(target.height)
      })
    }

    fs.writeFile(imagePath, image.toPNG(), (err) => {
      if (err) return global.ipc.notify(trans('system.error.could_not_save_image'))
      // Insert a relative path instead of an absolute one
      let pathToInsert = path.relative(currentFilePath, imagePath)

      // Everything worked out - now tell the editor to insert some text
      this._app.ipc.send('insert-text', `![${target.name}](${pathToInsert})\n`)
      // Tada!
    })

    return true
  }
}

module.exports = SaveImage
