/* global $ */
/**
* @ignore
* BEGIN HEADER
*
* Contains:        PasteImage class
* CVM-Role:        View
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This dialog displays a preview of the image currently in the
*                  clipboard and lets you choose different options.
*
* END HEADER
*/

const ZettlrDialog = require('./zettlr-dialog.js')
const { clipboard } = require('electron')
const path = require('path')
const md5 = require('md5')

class PasteImage extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'paste-image'
  }

  preInit (data) {
    data.size = clipboard.readImage().getSize() // First get the original size
    data.aspect = clipboard.readImage().getAspectRatio() // Then the aspect

    // Now reduce the image size and write the image into a data url to speed
    // up image preview rendering.
    data.img = clipboard.readImage().resize({ 'height': 600 }).toDataURL()

    if (clipboard.readText().length > 0) {
      // If you copy an image from the web, the browser sometimes inserts
      // the original URL to it as text into the clipboard. In this case
      // we've already got a good image name!
      data.imageName = path.basename(clipboard.readText(), path.extname(clipboard.readText()))
    } else {
      // In case there is no potential basename we could extract, simply
      // hash the dataURL. This way we can magically also prevent the same
      // image to be saved twice in the same directory. Such efficiency!
      data.imageName = md5('img' + data.img)
    }
    return data
  }

  get imageNameElement () {
    return document.getElementById('img-name')
  }

  get imageName () {
    return this.imageNameElement.value
  }

  get imageWidthElement () {
    return document.getElementById('img-width')
  }

  get imageWidth () {
    return parseInt(this.imageWidthElement.value || 0)
  }

  set imageWidth (width) {
    this.imageWidthElement.value = width
  }

  get imageHeightElement () {
    return document.getElementById('img-height')
  }

  get imageHeight () {
    return parseInt(this.imageHeightElement.value || 0)
  }

  set imageHeight (height) {
    this.imageHeightElement.value = height
  }

  get aspectRatioElement () {
    return document.getElementById('aspect-ratio')
  }

  get aspectRatio () {
    return this.aspectRatioElement.value
  }

  postAct () {
    // Activate the sending buttons
    $('#save-cwd, #save-other').on('click', (e) => {
      // The content is either save-cwd or save-other
      global.ipc.send('save-image-from-clipboard', {
        'mode': $(e.target).attr('id'),
        'name': this.imageName,
        'width': this.imageWidth, // Resize to width, 0 indicates no change
        'height': this.imageHeight // Resize to height, 0 indicates no change
      })

      // Now close the dialog
      this.close()
    }) // End activate buttons

    // We need to trigger a replace manually, b/c pasting raw image data into
    // the src-attribute of an img does not trigger the onLoad-event listener.
    setTimeout(() => { this._place() }, 10)

    // Enable the custom javascript actions
    this.imageWidthElement.addEventListener('change', (e) => {
      if (this.shouldRetainAspectRatio()) {
        this.imageHeight = Math.round(this.imageWidth / this.aspectRatio)
      }
    })

    this.imageHeightElement.addEventListener('change', (e) => {
      if (this.shouldRetainAspectRatio()) {
        this.imageWidth = Math.round(this.imageHeight * this.aspectRatio)
      }
    })
  }

  shouldRetainAspectRatio () {
    return $('#aspect').prop('checked')
  }
}

module.exports = PasteImage
