/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnote renderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     An footnote renderer. Adds styling to footnotes
 *                  add child nodes.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { type RangeSet, type Range } from '@codemirror/state'
import { type EditorView, type ViewUpdate, ViewPlugin, Decoration, type DecorationSet } from '@codemirror/view'
import { rangeInSelection } from '../util/range-in-selection'

// We have to assign style in the decoration itself since child nodes do not inherit class names
const footnoteDeco = Decoration.mark({ attributes: { style: 'font-size: 0.8rem; vertical-align: super;' } })
const footnoteRefDeco = Decoration.mark({ attributes: { style: 'font-size: 0.8rem;' } })

function footnoteDecorations (view: EditorView): RangeSet<Decoration> {
  const ranges: Array<Range<Decoration>> = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter (node) {
        if (rangeInSelection(view.state, node.from, node.to, true)) {
          return
        }

        if (node.name !== 'Footnote' && node.name !== 'FootnoteRef' && node.name !== 'FootnoteRefLabel') {
          return
        }

        switch (node.name) {
          case 'Footnote':
          case 'FootnoteRefLabel': {
            ranges.push(footnoteDeco.range(node.from, node.to))
            break
          }
          case 'FootnoteRef': {
            ranges.push(footnoteRefDeco.range(node.from, node.to))
            break
          }
        }
      }
    })
  }

  return Decoration.set(ranges, true)
}

export const renderFootnotes = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = footnoteDecorations(view)
  }

  update (update: ViewUpdate): void {
    this.decorations = footnoteDecorations(update.view)
  }
}, {
  decorations: v => v.decorations
})
