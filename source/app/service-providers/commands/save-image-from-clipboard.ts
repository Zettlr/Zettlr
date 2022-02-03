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
import { trans } from '@common/i18n-main'
import sanitize from 'sanitize-filename'
import path from 'path'
import { promises as fs } from 'fs'
import { clipboard } from 'electron'
import isDir from '@common/util/is-dir'

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
  async run (evt: string /*, target: any */): Promise<any> {
    const activeFile = this._app.documents.activeFile
    if (activeFile === null) {
      return this._app.notifications.show(trans('system.error.fnf_message'))
    }

    const startPath = path.resolve(
      activeFile.dir,
      this._app.config.get('editor.defaultSaveImagePath')
    )

    const target = await this._app.windows.showPasteImageModal(startPath)
    if (target === undefined) {
      this._app.log.info('[Application] Aborted image pasting process.')
      return
    }

    // First check the name for sanity
    let targetFile = sanitize(target.name, { replacement: '-' })

    // A file must be opened and active, and the name valid
    if (targetFile === '') {
      return this._app.notifications.show(trans('system.error.no_allowed_chars'))
    }

    // Now check the extension of the name (some users may
    // prefer to choose to provide it already)
    if (![ '.png', '.jpg' ].includes(path.extname(targetFile).toLowerCase())) {
      targetFile += '.png'
    }

    // Now resolve the path correctly, taking into account a potential relative
    // path the user has chosen.

    // Now we need to make sure the directory exists.
    try {
      await fs.lstat(target.targetDir)
    } catch (err) {
      await fs.mkdir(target.targetDir, { recursive: true })
    }

    // If something went wrong or the user did not provide a directory, abort
    if (!isDir(target.targetDir)) {
      return this._app.notifications.show(trans('system.error.dnf_message'))
    }

    // Build the correct path
    let imagePath = path.join(target.targetDir, targetFile)

    // And now save the image
    let image = clipboard.readImage()

    // Somebody may have remotely overwritten the clipboard in the meantime
    if (image.isEmpty()) {
      return this._app.notifications.show(trans('system.error.could_not_save_image'))
    }

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

    this._app.log.info(`Saving image ${targetFile} to ${imagePath} ...`)

    if (path.extname(imagePath).toLowerCase() === '.png') {
      await fs.writeFile(imagePath, image.toPNG())
    } else if (path.extname(imagePath).toLowerCase() === '.jpg') {
      await fs.writeFile(imagePath, image.toJPEG(100))
    }

    // Insert a relative path instead of an absolute one
    let pathToInsert = path.relative(path.dirname(activeFile.path), imagePath)

    return pathToInsert
  }
}
