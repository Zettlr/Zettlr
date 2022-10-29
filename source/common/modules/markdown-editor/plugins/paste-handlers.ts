/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Paste Handlers
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This paste handler manages pasting of images.
 *
 * END HEADER
 */

import { Prec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { configField } from '../util/configuration'

const clipboard = window.clipboard
const ipcRenderer = window.ipc
const path = window.path

export const pasteHandler = Prec.highest(EditorView.domEventHandlers({
  paste (event, view) {
    if (!clipboard.hasImage()) {
      return true
    }

    const basePath = path.dirname(view.state.field(configField).metadata.path)

    // We've got an image. So we need to handle it.
    ipcRenderer.invoke('application', {
      command: 'save-image-from-clipboard',
      payload: { startPath: basePath }
    })
      .then((pathToInsert: string|undefined) => {
        // If the user aborts the pasting process, the command will return
        // undefined, so we have to check for this.
        if (pathToInsert !== undefined) {
          // Replace backward slashes with forward slashes to make Windows
          // paths cross-platform compatible
          const relative = path.relative(basePath, pathToInsert)
          const sanitizedPath = relative.replace(/\\/g, '/')
          // We need to replace spaces, since the Markdown parser is strict here
          const tag = `![${path.basename(sanitizedPath)}](${sanitizedPath.replace(/ /g, '%20')})`
          const { from, to } = view.state.selection.main
          view.dispatch({ changes: { from, to, insert: tag } })
        }
      })
      .catch(err => console.error(err))
    return true // We're handling the event
  }
}))
