// This command saves an image from clipboard

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')
const sanitize = require('sanitize-filename')
const path = require('path')
const fs = require('fs')
const { clipboard } = require('electron')
const { isDir } = require('../../common/zettlr-helpers')

class SaveImage extends ZettlrCommand {
  constructor (app) {
    super(app, 'save-image-from-clipboard')
  }

  /**
   * Saves the image that is currently in the clipboard to file and sends an
   * insert command to the renderer, telling it to link the image.
   * @param  {Object} target Options on the image
   * @return {void}        Does not return.
   */
  run (target) {
    // target either contains "save-cwd" (save in current working directory) or
    // "save-other" (save to a path that has to be chosen by the user)
    // If no directory is selected currently, we can't save to cwd.
    if (target.mode === 'save-cwd' && !this._app.getCurrentDir()) {
      return this._app.notify(trans('system.error.dnf_message'))
    }

    // Check the name for sanity
    target.name = sanitize(target.name, '-')
    if (target.name === '') {
      return this._app.notify(trans('system.error.no_allowed_chars'))
    }

    // Now check the extension of the name (some users may prefer to choose to
    // provide it already)
    if (path.extname(target.name) !== '.png') target.name += '.png'

    // Retrieve the directory
    let p = null
    if (target.mode === 'save-cwd') {
      p = this._app.getCurrentDir().path
    } else if (target.mode === 'save-other') {
      p = this._app.getWindow().askDir()[0] // We only take one directory
    }

    // If something went wrong or the user did not provide a directory, abort
    if (!isDir(p)) return this._app.notify(trans('system.error.dnf_message'))

    p = path.join(p, target.name)

    // Save the image!
    let image = clipboard.readImage()

    // Somebody may have remotely overwritten the clipboard in the meantime
    if (image.isEmpty()) return this._app.notify(trans('system.error.could_not_save_image'))

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

    fs.writeFile(p, image.toPNG(), (err) => {
      if (err) return this._app.notify(trans('system.error.could_not_save_image'))
      // Everything worked out - now tell the editor to insert some text
      this._app.ipc.send('insert-text', `![${target.name}](${p})\n`)
      // Tada!
    })

    return true
  }
}

module.exports = SaveImage
