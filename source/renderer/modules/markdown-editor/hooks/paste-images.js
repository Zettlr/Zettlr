// Hook for pasting images

const { clipboard } = require('electron')
const PasteImage = require('../../../dialog/paste-image')

module.exports = (cm) => {
  /**
   * Hook into the beforeChange event of CodeMirror
   *
   * @param   {String}      beforeChange  The event name
   * @param   {CodeMirror}  cm            The calling instance
   * @param   {Object}      changeObj     The change object
   */
  cm.on('beforeChange', (cm, changeObj) => {
    // If text is to be pasted, we may need to exchange some text.
    if (changeObj.origin === 'paste') {
      // First check if there's an image in the clipboard. In this case we
      // need to cancel the paste event and handle the image ourselves.
      let image = clipboard.readImage()
      let plain = clipboard.readText()
      let explicitPaste = plain === changeObj.text.join('\n')

      if (!image.isEmpty() && (explicitPaste || !changeObj.text)) {
        // We've got an image. So we need to handle it.
        displayPasteImageDialog(cm)
        return changeObj.cancel() // Cancel handling of the event
      }
    }
  })

  /**
   * Hook into the paste event of the instance wrapper, to capture image
   * pasts if there is no text in the clipboard as well.
   */
  cm.getWrapperElement().addEventListener('paste', (e) => {
    let image = clipboard.readImage()
    // Trigger the image insertion process from here only if there is no text
    // in the clipboard. This is because CodeMirror will only trigger the
    // beforeChange event (where we have similar logic) if there is text in the
    // clipboard. If we would handle it ONLY here, you could not paste an image
    // while there is no text in the clipboard, and if we would handle it
    // ALWAYS (even with text in the clipboard), you'd get the paste-image
    // dialog twice -- once when the beforeChange event triggers, and then here
    // as well.
    if (!image.isEmpty() && clipboard.readText().length === 0) {
      displayPasteImageDialog(cm)
    }
  })
}

function displayPasteImageDialog (cm) {
  const basePath = cm.getOption('zettlr').markdownImageBasePath
  this._currentDialog = new PasteImage()
  this._currentDialog.init({ 'activeFile': { path: basePath } }).open()
  this._currentDialog.on('afterClose', (e) => { this._currentDialog = null })
}
