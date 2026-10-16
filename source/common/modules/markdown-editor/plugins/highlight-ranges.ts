/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Highlight Ranges
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small plugin enabling search-like highlighting of arbitrary ranges
 *
 * END HEADER
 */

import { StateEffect, StateField, type EditorState, type SelectionRange } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'

// cm-selectionMatch is defined in the search plugin
const highlightDeco = Decoration.mark({ class: 'cm-selectionMatch' })

export const highlightRangesEffect = StateEffect.define<SelectionRange[]>()

export const highlightRanges = StateField.define<DecorationSet>({
  create (_state: EditorState) {
    return Decoration.none
  },
  update (value, transaction) {
    const effect = transaction.effects.findLast(effect => effect.is(highlightRangesEffect))
    if (effect !== undefined) {
      return Decoration.set(
        effect.value.map(range => highlightDeco.range(range.from, range.to))
      )
    }

    return transaction.docChanged ? value.map(transaction.changes) : value
  },
  provide: f => EditorView.decorations.from(f)
})
