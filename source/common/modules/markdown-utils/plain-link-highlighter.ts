/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Plain link highlight Extension
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports an extension that can be used in CMv6
 *                  editors to highlight and make plain links anywhere clickable.
 *
 * END HEADER
 */

import { Decoration, MatchDecorator, ViewPlugin, EditorView, type ViewUpdate } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'

/**
 * The class to be applied
 */
const linkDeco = Decoration.mark({
  attributes: {
    class: 'cm-clickable-link',
    title: trans('Cmd/Ctrl-click to follow this link')
  }
})

/**
 * A very basic regexp for very coarse (but hence fast) link matching
 *
 * @var {RegExp}
 */
const simpleLinkRegex = /https?:\/\/\S+/g

/**
 * A basic match decorator that applies the linkDeco to any plain link
 *
 * @return  {MatchDecorator}  The match decorator
 */
const linkDecorator = new MatchDecorator({
  regexp: simpleLinkRegex,
  decoration: _m => linkDeco
})

/**
 * This plugin uses the link match decorator to highlight plain links.
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {ViewPlugin}        The finished view plugin
 */
const linkHighlight = ViewPlugin.define(view => ({
  decorations: linkDecorator.createDeco(view),
  update (u: ViewUpdate) {
    this.decorations = linkDecorator.updateDeco(u, this.decorations)
  }
}), { decorations: v => v.decorations })

/**
 * If applicable, follows a link from the editor.
 *
 * @param   {MouseEvent}  event  The triggering MouseEvent
 * @param   {EditorView}  view   The editor view
 */
function maybeOpenLink (event: MouseEvent, view: EditorView): void {
  const cmd = process.platform === 'darwin' && event.metaKey
  const ctrl = process.platform !== 'darwin' && event.ctrlKey
  if (!cmd && !ctrl) {
    return
  }

  const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
  if (pos === null) {
    return
  }

  const line = view.state.doc.lineAt(pos)

  for (const match of line.text.matchAll(simpleLinkRegex)) {
    if (match.index === undefined) {
      continue
    }

    const offset = line.from + match.index

    if (offset <= pos && offset + match[0].length >= pos) {
      window.location.assign(match[0])
      return
    }
  }
}

/**
 * A small theme to apply underlines to detected plain links
 *
 * @return  {EditorView.theme}  The theme
 */
const plainLinkTheme = EditorView.theme({
  '.cm-clickable-link': { textDecoration: 'underline' }
})

/**
 * This extension provides underline highlighting for plain links found in an
 * editor instance and makes them clickable.
 *
 * @var {Extension[]}
 */
export const plainLinkHighlighter = [
  linkHighlight,
  plainLinkTheme,
  EditorView.domEventHandlers({
    mousedown: maybeOpenLink
  })
]
