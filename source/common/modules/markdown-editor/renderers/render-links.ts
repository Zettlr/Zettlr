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
        if (node.name !== 'Link' && node.name !== 'ZknLink') {
          return
        }

        // Do not hide any characters if a selection is inside here
        if (rangeInSelection(view.state, node.from, node.to)) {
          return false
        }

        if (node.name === 'ZknLink') {
          const contentNode = node.node.getChild('ZknLinkContent')
          const titleNode = node.node.getChild('ZknLinkTitle')
          const pipeNode = node.node.getChild('ZknLinkPipe')
          if (contentNode !== null && titleNode !== null && pipeNode !== null) {
            ranges.push(
              hiddenDeco.range(contentNode.from, contentNode.to),
              hiddenDeco.range(pipeNode.from, pipeNode.to)
            )
          }
        } else {
          // It's a regular Markdown Link
          const marks = node.node.getChildren('LinkMark')

          // We need at least three LinkMarks: [, ], and ( since the parser will
          // also parse ellipses as Links (a.k.a. reference style links)
          if (marks.length < 3) {
            return false
          }

          if (marks[0].to === marks[1].from) {
            return false // Empty link title -> would hide the entire link
          }

          ranges.push(
            hiddenDeco.range(marks[0].from, marks[0].to),
            hiddenDeco.range(marks[1].from, marks[marks.length - 1].to)
          )
        }
      }
    })
  }

  // Fallback: Manually hide [[ and ]] using RegExp
  const docText = view.state.doc.toString()
  const bracketPattern = /\[\[(.*?)\]\]/g
  let match
  while ((match = bracketPattern.exec(docText)) !== null) {
    const start = match.index
    const end = match.index + match[0].length
    ranges.push(
      hiddenDeco.range(start, start + 2),     // hide [[
      hiddenDeco.range(end - 2, end)          // hide ]]
    )
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
