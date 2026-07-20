/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Text direction statusbar item
 * CVM-Role:        View
 * Maintainer:      Writer fork
 * License:         GNU GPL v3
 *
 * Description:     A statusbar item that shows the document's base text
 *                  direction and lets the user switch it. The choice is
 *                  persisted as a `direction:` key in the document's YAML
 *                  frontmatter ('auto' is the default and removes the key).
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { hasMarkdownExt } from '@common/util/file-extention-checks'
import { type StatusbarItem } from '../statusbar'
import { configField } from '../util/configuration'
import { type DocumentDirection, documentDirectionField, effectiveDirection } from './bidi'

/**
 * Persists the given direction in the document's YAML frontmatter: replaces or
 * removes an existing `direction:` key, inserts one into an existing
 * frontmatter, or creates a frontmatter if the document has none.
 *
 * @param  {EditorView}         view       The editor view
 * @param  {DocumentDirection}  direction  The direction to persist
 */
function applyDirection (view: EditorView, direction: DocumentDirection|null): void {
  const doc = view.state.doc

  if (doc.lines >= 2 && doc.line(1).text === '---') {
    for (let i = 2; i <= doc.lines; i++) {
      const line = doc.line(i)

      if (/^direction:/.test(line.text)) {
        if (direction === null) {
          // No override -> remove the key (including its line break)
          view.dispatch({ changes: { from: line.from, to: Math.min(line.to + 1, doc.length) } })
        } else {
          view.dispatch({ changes: { from: line.from, to: line.to, insert: `direction: ${direction}` } })
        }
        return
      }

      if (line.text === '---' || line.text === '...') {
        // Fence closed without a direction key -> insert one before the fence
        if (direction !== null) {
          view.dispatch({ changes: { from: line.from, insert: `direction: ${direction}\n` } })
        }
        return
      }
    }
    // Unterminated frontmatter: not actually a frontmatter, so fall through
  }

  if (direction !== null) {
    view.dispatch({ changes: { from: 0, insert: `---\ndirection: ${direction}\n---\n\n` } })
  }
}

/**
 * Displays the document's base text direction and allows changing it.
 *
 * @param   {EditorState}    state  The editor state
 * @param   {EditorView}     view   The editor view
 *
 * @return  {StatusbarItem}         The statusbar item, or null
 */
export function textDirectionStatus (state: EditorState, view: EditorView): StatusbarItem|null {
  const config = state.field(configField, false)
  const override = state.field(documentDirectionField, false)
  if (config === undefined || override === undefined || !hasMarkdownExt(config.metadata.path)) {
    return null
  }

  const labels: Record<DocumentDirection, string> = {
    auto: trans('Automatic'),
    ltr: trans('Left-to-right'),
    rtl: trans('Right-to-left')
  }

  return {
    content: `⇆ ${labels[effectiveDirection(state)]}`,
    title: trans('Base text direction'),
    onClick (event) {
      // Ensure the event doesn't get propagated to the DOM root where it would
      // be picked up by the context menu handler and closed again immediately.
      event.stopPropagation()
      const items: AnyMenuItem[] = [
        {
          type: 'checkbox',
          id: 'default',
          label: trans('Application default'),
          checked: override === null
        },
        { type: 'separator' },
        ...([ 'auto', 'ltr', 'rtl' ] as const).map((dir): AnyMenuItem => ({
          type: 'checkbox',
          id: dir,
          label: labels[dir],
          checked: override === dir
        }))
      ]

      showPopupMenu({ x: event.clientX, y: event.clientY }, items, clickedID => {
        applyDirection(view, clickedID === 'default' ? null : clickedID as DocumentDirection)
      })
    }
  }
}
