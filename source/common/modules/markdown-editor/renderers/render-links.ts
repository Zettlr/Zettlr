/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LinkRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer can render links and URLs.
 *
 * END HEADER
 */

import { type EditorView, type DecorationSet, ViewPlugin, type ViewUpdate, Decoration } from '@codemirror/view'
import type { RangeSet, Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { rangeInSelection } from '../util/range-in-selection'

function hideLinkMarkers (view: EditorView): RangeSet<Decoration> {
  const ranges: Array<Range<Decoration>> = []
  const hiddenDeco = Decoration.replace({})

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter (node) {
        if (node.name !== 'Link') {
          return
        }

        // Do not hide any characters if a selection is inside here
        if (rangeInSelection(view.state, node.from, node.to)) {
          return false
        }

        const marks = node.node.getChildren('LinkMark')

        // We need at least three LinkMarks: [, ], and ( since the parser will
        // also parse ellipses as Links (a.k.a. reference style links)
        if (marks.length < 3) {
          return false
        }

        ranges.push(
          hiddenDeco.range(marks[0].from, marks[0].to),
          hiddenDeco.range(marks[1].from, marks[marks.length - 1].to)
        )
      }
    })
  }

  return Decoration.set(ranges, true)
}

export const renderLinks = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = hideLinkMarkers(view)
  }

  update (update: ViewUpdate): void {
    this.decorations = hideLinkMarkers(update.view)
  }
}, {
  decorations: v => v.decorations
})
