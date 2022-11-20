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
import html2md from '@common/util/html-to-md'
import { getConverter } from '@common/util/md-to-html'
import { configField } from './configuration'

const clipboard = window.clipboard

/**
 * Copies whatever is currently selected into the clipboard as HTML (with plain
 * text fallback)
 *
 * @param   {EditorView}  view  The view
 */
export function copyAsHTML (view: EditorView): void {
  const { library } = view.state.field(configField).metadata
  const selections: string[] = []
  const md2html = getConverter(window.getCitationCallback(library))

  for (const { from, to } of view.state.selection.ranges) {
    selections.push(view.state.sliceDoc(from, to))
  }

  clipboard.write({
    text: selections.join('\n'),
    html: md2html(selections.join('\n'))
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
  const plain = clipboard.readText()
  const html = clipboard.readHTML()

  if (html === '' || html === plain) {
    view.dispatch(view.state.replaceSelection(plain))
  } else {
    // Convert HTML to plain and insert that
    const converted = html2md(html)
    view.dispatch(view.state.replaceSelection(converted))
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
