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
    // Write the image as a data stream into the img variable. This way it
    // can be previewed before it is decided what to do with it.
    data.img = clipboard.readImage().toDataURL()
    data.size = clipboard.readImage().getSize()
    data.aspect = clipboard.readImage().getAspectRatio()
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

  postAct () {
    // Activate the sending buttons
    $('#save-cwd, #save-other').on('click', (e) => {
      // The content is either save-cwd or save-other
      global.ipc.send('save-image-from-clipboard', {
        'mode': $(e.target).attr('id'),
        'name': $('#img-name').val(),
        'width': parseInt($('#img-width').val() || 0), // Resize to width, 0 indicates no change
        'height': parseInt($('#img-height').val() || 0) // Resize to height, 0 indicates no change
      })

      // Now close the dialog
      this.close()
    }) // End activate buttons

    // We need to trigger a replace manually, b/c pasting raw image data into
    // the src-attribute of an img does not trigger the onLoad-event listener.
    setTimeout(() => { this._place() }, 10)
  }
}

module.exports = PasteImage
