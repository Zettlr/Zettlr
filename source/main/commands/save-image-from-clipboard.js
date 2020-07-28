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
    let targetFile = sanitize(target.name, '-')
    let activeFile = this._app.getFileSystem().findFile(this._app.getFileSystem().getActiveFile())

    // A file must be opened and active, and the name valid
    if (targetFile === '') return global.ipc.notify(trans('system.error.no_allowed_chars'))
    if (!activeFile) return global.ipc.notify(trans('system.error.fnf_message'))

    // PNG is the default file format.
    let fileFormat = 'png'
    // Now check the file extension. Set the file format to JPEG if the
    // extension is 'jpg', or add 'png' missing.
    if (path.extname(targetFile).toLowerCase() === '.jpg') {
      fileFormat = 'jpg'
    } else if (path.extname(targetFile).toLowerCase() !== '.png') {
      targetFile += '.png'
    }

    // Now resolve the path correctly, taking into account a potential relative
    // path the user has chosen.
    let targetPath = path.resolve(
      path.dirname(activeFile.path),
      global.config.get('editor.defaultSaveImagePath') || ''
    )

    console.log('Preparing to save: ' + activeFile.name + '; filepath: ' + targetPath)

    // Did the user want to choose the directory for this one? In this case,
    // that choice overrides the resolved path from earlier.
    if (target.mode === 'save-other') {
      let dirs = await this._app.getWindow().askDir()
      targetPath = dirs.filePaths[0] // We only take one directory
    }

    // Failsafe. Shouldn't be necessary, but you never know. (In that case log
    // an error, just to be safe)
    if (!path.isAbsolute(targetPath)) {
      global.log.error(`Error while saving image to ${targetPath}: Not absolute. This should not have happened.`)
      targetPath = path.resolve(path.dirname(activeFile.path), targetPath)
    }

    // Now we need to make sure the directory exists.
    try {
      fs.lstatSync(targetPath)
    } catch (e) {
      fs.mkdirSync(targetPath, { recursive: true })
    }

    // If something went wrong or the user did not provide a directory, abort
    if (!isDir(targetPath)) return global.ipc.notify(trans('system.error.dnf_message'))

    // Build the correct path
    let imagePath = path.join(targetPath, targetFile)

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

    global.log.info(`Saving image ${targetFile} at ${imagePath} ...`)

    let imageData = (fileFormat === 'jpg') ? image.toJPEG(85) : image.toPNG()

    fs.writeFile(imagePath, imageData, (err) => {
      if (err) return global.ipc.notify(trans('system.error.could_not_save_image'))
      // Insert a relative path instead of an absolute one
      let pathToInsert = path.relative(path.dirname(activeFile.path), imagePath)

      // Everything worked out - now tell the editor to insert some text
      this._app.ipc.send('insert-text', `![${targetFile}](${pathToInsert})\n`)
      // Tada!
    })

    return true
  }
}

module.exports = SaveImage
