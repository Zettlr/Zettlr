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

import ZettlrCommand from './zettlr-command'
import { trans } from '../../common/i18n'
import sanitize from 'sanitize-filename'
import path from 'path'
import fs from 'fs'
import { clipboard } from 'electron'
import isDir from '../../common/util/is-dir'

export default class SaveImage extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'save-image-from-clipboard')
  }

  /**
   * Saves the image that is currently in the clipboard to file and sends an
   * insert command to the renderer, telling it to link the image.
   * @param {String} evt The event name
   * @param  {Object} target Options on the image
   * @return {void}        Does not return.
   */
  async run (evt: string, target: any): Promise<void> {
    // First check the name for sanity
    let targetFile = sanitize(target.name, { replacement: '-' })

    const activeHash = this._app.getFileSystem().activeFile
    if (activeHash === null) {
      return global.notify.normal(trans('system.error.fnf_message'))
    }

    const activeFile = this._app.getFileSystem().findFile(activeHash)
    if (activeFile === null) {
      return global.notify.normal(trans('system.error.fnf_message'))
    }

    // A file must be opened and active, and the name valid
    if (targetFile === '') {
      return global.notify.normal(trans('system.error.no_allowed_chars'))
    }

    // Now check the extension of the name (some users may
    // prefer to choose to provide it already)
    if (path.extname(targetFile) !== '.png') {
      targetFile += '.png'
    }

    // Now resolve the path correctly, taking into account a potential relative
    // path the user has chosen.
    let targetPath = path.resolve(
      path.dirname(activeFile.path),
      global.config.get('editor.defaultSaveImagePath') || ''
    )

    // Did the user want to choose the directory for this one? In this case,
    // that choice overrides the resolved path from earlier.
    if (target.mode === 'save-other') {
      let dirs = await this._app.askDir()
      targetPath = dirs[0] // We only take one directory
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
    if (!isDir(targetPath)) return global.notify.normal(trans('system.error.dnf_message'))

    // Build the correct path
    let imagePath = path.join(targetPath, targetFile)

    // And now save the image
    let image = clipboard.readImage()

    // Somebody may have remotely overwritten the clipboard in the meantime
    if (image.isEmpty()) return global.notify.normal(trans('system.error.could_not_save_image'))

    let size = image.getSize()
    let resizeWidth = parseInt(target.width)
    let resizeHeight = parseInt(target.height)
    let shouldResizeWidth = resizeWidth > 0 && resizeWidth !== size.width
    let shouldResizeHeight = resizeHeight > 0 && resizeHeight !== size.height

    // A final step: It may be that the user wanted to resize the image (b/c
    // it's too large or so). In this case, there are width and height
    // properties provided in target.
    if (shouldResizeWidth || shouldResizeHeight) {
      // The resize function requires real integers
      image = image.resize({
        'width': resizeWidth,
        'height': resizeHeight
      })
    }

    global.log.info(`Saving image ${targetFile} to ${imagePath} ...`)

    fs.writeFile(imagePath, image.toPNG(), (err) => {
      if (err) return global.notify.normal(trans('system.error.could_not_save_image'))
      // Insert a relative path instead of an absolute one
      let pathToInsert = path.relative(path.dirname(activeFile.path), imagePath)

      // Everything worked out - now tell the editor to insert some text
      this._app.ipc.send('insert-text', `![${targetFile}](${pathToInsert})\n`)
      // Tada!
    })
  }
}
