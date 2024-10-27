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

import { type ChangeSpec } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { md2html } from '@common/modules/markdown-utils'
import html2md from '@common/util/html-to-md'
import { configField } from './configuration'
import { pathBasename, pathDirname, relativePath } from '@common/util/renderer-path-polyfill'

const ipcRenderer = window.ipc

/**
 * Handles a paste event (both images and text/HTML)
 *
 * @param  {EditorView}  view  The editor view
 */
async function handlePaste (view: EditorView): Promise<void> {
  const basePath = pathDirname(view.state.field(configField).metadata.path)

  // First step: Check for images and, if so, insert them.
  const clipboardItems = await navigator.clipboard.read()
  for (const item of clipboardItems) {
    const hasPlain = item.types.includes('text/plain')
    const hasHTML = item.types.includes('text/html')

    if (item.types.includes('image/png')) {
      const pathToInsert: string|undefined = await ipcRenderer.invoke('application', {
        command: 'save-image-from-clipboard',
        payload: { startPath: basePath }
      })

      // If the user aborts the pasting process, the command will return
      // undefined, so we have to check for this.
      if (pathToInsert !== undefined) {
        // Replace backward slashes with forward slashes to make Windows
        // paths cross-platform compatible
        const relative = relativePath(basePath, pathToInsert)
        const sanitizedPath = relative.replace(/\\/g, '/')
        // We need to replace spaces, since the Markdown parser is strict here
        const tag = `![${pathBasename(sanitizedPath)}](${sanitizedPath.replace(/ /g, '%20')})`
        view.dispatch(view.state.replaceSelection(tag))
      }
      return // NOTE: We are ignoring additional images here, because (a) this
      // should normally not happen, and (b) it could be an avenue to block the
      // app if a rogue app adds many items with single images.
    } else if (hasPlain && hasHTML) {
      // ... I understand *why* they have implemented this ... but ...
      const plain = await (await item.getType('text/plain')).text()
      const html = await (await item.getType('text/html')).text()
      if (html === plain) {
        view.dispatch(view.state.replaceSelection(plain))
      } else {
        const { boldFormatting, italicFormatting } = view.state.field(configField)
        const emphasis = italicFormatting
        const strong = boldFormatting.includes('*') ? '*' : '_'
        const converted = await html2md(html, false, { strong, emphasis })
        view.dispatch(view.state.replaceSelection(converted))
      }
    } else if (hasPlain) {
      const plain = await (await item.getType('text/plain')).text()
      view.dispatch(view.state.replaceSelection(plain))
    }
  }
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

  const { zknLinkFormat } = view.state.field(configField)

  const plainBlob = new Blob([selections.join('\n')], { type: 'text/plain' })
  const htmlBlob = new Blob(
    [md2html(selections.join('\n'), window.getCitationCallback(library), zknLinkFormat)],
    { type: 'text/html' }
  )

  navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': plainBlob,
      'text/html': htmlBlob
    })
  ]).catch(err => console.error(err))
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

  navigator.clipboard.write([
    new ClipboardItem({
      'text/plain': new Blob([selections.join('\n')], { type: 'text/plain' })
    })
  ])
    .catch(err => console.error(err))
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
  handlePaste(view).catch(err => console.error(err))
}

/**
 * Explicitly paste the plain text from the clipboard.
 *
 * @param   {EditorView}  view  The view
 */
export function pasteAsPlain (view: EditorView): void {
  navigator.clipboard.readText()
    .then(text => {
      if (text !== '') {
        view.dispatch(view.state.replaceSelection(text))
      }
    })
    .catch(err => console.error(err))
}
