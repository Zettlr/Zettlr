/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror paste images hook
 * CVM-Role:        CodeMirror plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles situations where the user pastes image data onto
 *                  the editor.
 *
 * END HEADER
 */

import CodeMirror from 'codemirror'

const path = window.path
const ipcRenderer = window.ipc
const clipboard = window.clipboard

export default function pasteImagesHook (cm: CodeMirror.Editor): void {
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
      let plain = clipboard.readText()
      let explicitPaste = plain.replace(/\r/g, '') === changeObj.text.join('\n')

      if (clipboard.hasImage() && explicitPaste) {
        // We've got an image. So we need to handle it.
        ipcRenderer.invoke('application', {
          command: 'save-image-from-clipboard'
        })
          .then((pathToInsert: string|undefined) => {
            // If the user aborts the pasting process, the command will return
            // undefined, so we have to check for this.
            if (pathToInsert !== undefined) {
              // Replace backward slashes with forward slashes to make Windows
              // paths cross-platform compatible
              const sanitizedPath = pathToInsert.replace(/\\/g, '/')
              cm.replaceSelection(`![${path.basename(sanitizedPath)}](${sanitizedPath})`)
            }
          })
          .catch(err => console.error(err))
        return changeObj.cancel() // Cancel handling of the event
      }
    }
  })

  /**
   * Hook into the paste event of the instance wrapper, to capture image
   * pasts if there is no text in the clipboard as well.
   */
  cm.getWrapperElement().addEventListener('paste', (e) => {
    // Trigger the image insertion process from here only if there is no text
    // in the clipboard. This is because CodeMirror will only trigger the
    // beforeChange event (where we have similar logic) if there is text in the
    // clipboard. If we would handle it ONLY here, you could not paste an image
    // while there is no text in the clipboard, and if we would handle it
    // ALWAYS (even with text in the clipboard), you'd get the paste-image
    // dialog twice -- once when the beforeChange event triggers, and then here
    // as well.
    if (clipboard.hasImage() && clipboard.readText().length === 0) {
      // Prevent CodeMirror from firing a beforeChange event if some text was
      // selected (see #3141)
      e.stopPropagation()
      e.preventDefault()
      ipcRenderer.invoke('application', {
        command: 'save-image-from-clipboard'
      })
        .then((pathToInsert: string|undefined) => {
          // If the user aborts the pasting process, the command will rturn
          // undefined, so we have to check for this.
          if (pathToInsert !== undefined) {
            // Replace backward slashes with forward slashes to make Windows paths
            // cross-platform compatible
            const sanitizedPath = pathToInsert.replace(/\\/g, '/')
            cm.replaceSelection(`![${path.basename(sanitizedPath)}](${sanitizedPath})`)
          }
        })
        .catch(err => console.error(err))
    }
  })
}
