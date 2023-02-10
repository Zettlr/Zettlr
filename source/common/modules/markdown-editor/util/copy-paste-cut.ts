/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Copy, Paste, and Cut actions
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a set of utility functions that can be utilitzed
 *                  for copying, cutting, and pasting Markdown and HTML
 *
 * END HEADER
 */

import { ChangeSpec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { md2html } from '@common/modules/markdown-utils'
import html2md from '@common/util/html-to-md'
import { configField } from './configuration'

const clipboard = window.clipboard
const ipcRenderer = window.ipc
const path = window.path

/**
 * This function attempts to paste an image into the editor. Should be called by
 * paste handlers to ensure it has a chance of saving an image. Returns true if
 * there was an image in the clipboard and this function is handling the paste
 * event.
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {boolean}           True if an image has been handled, else false.
 */
export function pasteImage (view: EditorView): boolean {
  if (!clipboard.hasImage()) {
    return false
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

/**
 * Copies whatever is currently selected into the clipboard as HTML (with plain
 * text fallback)
 *
 * @param   {EditorView}  view  The view
 */
export function copyAsHTML (view: EditorView): void {
  const { library } = view.state.field(configField).metadata
  const selections: string[] = []

  for (const { from, to } of view.state.selection.ranges) {
    selections.push(view.state.sliceDoc(from, to))
  }

  clipboard.write({
    text: selections.join('\n'),
    html: md2html(selections.join('\n'), library)
  })
}

/**
 * Copies whatever is currently selected into the clipboard as-is.
 *
 * @param   {EditorView}  view  The view
 */
export function copyAsPlain (view: EditorView): void {
  const selections: string[] = []

  for (const { from, to } of view.state.selection.ranges) {
    selections.push(view.state.sliceDoc(from, to))
  }

  clipboard.write({ text: selections.join('\n') })
}

/**
 * Cuts the text which is currently selected. Can write the text to clipboard as
 * either plain text or HTML
 *
 * @param   {EditorView}  view    The view
 * @param   {boolean}     asHTML  Optional, if set to true copies as HTML
 */
export function cut (view: EditorView, asHTML?: boolean): void {
  // Cut is basically just copy + delete
  if (asHTML === true) {
    copyAsHTML(view)
  } else {
    copyAsPlain(view)
  }

  const changes: ChangeSpec[] = []
  for (const { from, to } of view.state.selection.ranges) {
    changes.push({ from, to, insert: '' })
  }

  view.dispatch({ changes })
}

/**
 * Pastes whatever is in the clipboard as plain text, converting potential HTML
 * to Markdown if applicable
 *
 * @param   {EditorView}  view  The view
 */
export function paste (view: EditorView): void {
  // Allow the image paster to paste an image before attempting to paste text
  if (pasteImage(view)) {
    return
  }

  const plain = clipboard.readText()
  const html = clipboard.readHTML()

  if (html === '' || html === plain) {
    view.dispatch(view.state.replaceSelection(plain))
  } else {
    // Convert HTML to plain and insert that
    html2md(html).then(converted => {
      view.dispatch(view.state.replaceSelection(converted))
    })
      .catch(e => console.error('Could not paste HTML code', e))
  }
}

/**
 * Explicitly paste the plain text from the clipboard.
 *
 * @param   {EditorView}  view  The view
 */
export function pasteAsPlain (view: EditorView): void {
  const plain = clipboard.readText()
  if (plain !== '') {
    view.dispatch(view.state.replaceSelection(plain))
  }
}
