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
import md5 from 'md5'
import { promises as fs } from 'fs'
import { clipboard, ipcMain, nativeImage } from 'electron'
import { showNativeNotification } from '@common/util/show-notification'
import type { AppServiceContainer } from 'source/app/app-service-container'

export interface SaveImageFromClipboardAPI {
  basePath: string
  imageName?: string
  imageData: string // base64 encoded image data
}

export interface PasteModalResult {
  targetDir: string
  name: string
  width: string
  height: string
}

export default class SaveImage extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'save-image-from-clipboard')
  }

  /**
   * Takes an image provided for by the renderer and displays a dialog to the
   * user asking for some settings to save the image. Afterwards, returns back
   * to the renderer the absolute path to the image.
   *
   * @param   {string}  evt  The event name
   * @param   {any}     arg  Options on the image
   * @return  {string}       The absolute path to the saved image
   */
  async run (evt: string, arg: SaveImageFromClipboardAPI): Promise<string|undefined> {
    const defaultPath = this._app.config.get().editor.defaultSaveImagePath
    const startPath = path.resolve(arg.basePath, defaultPath)
    let image = nativeImage.createFromDataURL(arg.imageData)

    // When the user takes a screenshot into the clipboard and pastes that, the
    // Chromium API sets the "file"'s name to a generic "image.png". In that
    // case we want to provide a unique one. See #5449
    if (arg.imageName === 'image.png') {
      arg.imageName = undefined
    }

    // The paste image modal will request the image's data once after it has
    // been loaded.
    // NOTE: We must implement this logic here in main which will (a) save the
    // ridiculous amount of code it takes to get that exact information with
    // only browser APIs, and (b) circumvent permission issues (since in the
    // browser, reading from clipboard often requires the user to do something).
    ipcMain.handleOnce('paste-image-retrieve-data', (event) => {
      const text = clipboard.readText()

      const dataUrl = arg.imageData

      let name = ''
      if (arg.imageName !== undefined) {
        name = arg.imageName // Caller has provided a name
      } else if (text.length > 0) {
        // If you copy an image from the web, the browser sometimes inserts
        // the original URL to it as text into the clipboard. In this case
        // we've already got a good image name!
        const basename = path.basename(text, path.extname(text))
        name = basename + '.png'
      } else {
        // In case there is no potential basename we could extract, simply
        // hash the dataURL. This way we can magically also prevent the same
        // image to be saved twice in the same directory. Such efficiency!
        name = md5('img' + dataUrl) + '.png'
      }
      return { dataUrl, name, size: image.getSize(), aspect: image.getAspectRatio() }
    })

    const target = await this._app.windows.showPasteImageModal(startPath)
    if (target === undefined) {
      this._app.log.info('[Application] Aborted image pasting process.')
      return
    }

    // First check the name for sanity
    let targetFile = sanitize(target.name, { replacement: '-' })

    // A file must be opened and active, and the name valid
    if (targetFile === '') {
      showNativeNotification(trans('The provided name did not contain any allowed letters.'))
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
    if (!await this._app.fsal.isDir(target.targetDir)) {
      showNativeNotification(trans('The requested directory was not found.'))
    }

    // Build the correct path
    let imagePath = path.join(target.targetDir, targetFile)

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
      image = image.resize({ width: resizeWidth, height: resizeHeight })
    }

    this._app.log.info(`Saving image ${targetFile} to ${imagePath} ...`)

    if (path.extname(imagePath).toLowerCase() === '.png') {
      await fs.writeFile(imagePath, image.toPNG())
    } else if (path.extname(imagePath).toLowerCase() === '.jpg') {
      await fs.writeFile(imagePath, image.toJPEG(100))
    }

    return imagePath
  }
}
