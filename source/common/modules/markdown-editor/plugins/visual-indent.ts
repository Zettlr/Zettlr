/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Visual indentation plugin
 * CVM-Role:        ViewPlugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin ensures that lines in soft-wrapped editors are
 *                  visually correctly indented. It additionally ensures that
 *                  lists, etc. are correctly indented so that the list marker
 *                  is placed outside of the text block.
 *
 * END HEADER
 */

import { syntaxTree, foldedRanges } from '@codemirror/language'
import { RangeSet, type Range } from '@codemirror/state'
import {
  Decoration,
  MatchDecorator,
  ViewPlugin,
  type EditorView,
  type ViewUpdate
} from '@codemirror/view'
import { SpaceWidget } from '../renderers/render-emphasis'

// Since tab characters have no fixed with in the editor,
// we need to render every tab with the equivalent number of space
// characters to prevent jumping in the editor.
// The jumping is caused by the tab character recalculating its
// width as the line indentation is changed.
const tabReplaceDeco = new MatchDecorator({
  regexp: /\t/g,
  boundary: /[^\t]/g,
  decoration: (_match, view, _pos) => Decoration.replace({ widget: new SpaceWidget(view.state.tabSize) })
})

function render (view: EditorView, measurements?: Map<string, number>): RangeSet<Decoration> {
  const ranges: Array<Range<Decoration>> = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter (node) {
        if (node.name === 'FencedCode') {
          return false
        }

        if ([ 'Paragraph', 'Blockquote', 'CodeBlock', 'BulletList', 'OrderedList' ].includes(node.name)) {
          const firstLine = view.state.doc.lineAt(node.from).number
          const lastLine = view.state.doc.lineAt(node.to).number

          for (let i = firstLine; i <= lastLine; i++) {
            const line = view.state.doc.line(i)

            // First determine count the indent based on leading whitespace
            const whitespaceMatch = /^[ \t]*/.exec(line.text)
            const leadingWhitespace = whitespaceMatch !== null ? whitespaceMatch[0].length : 0

            // Second, determine the offset based on list or blockquote elements.
            let formatCharOffset = 0
            if (node.name === 'Blockquote' || node.name === 'Paragraph') {
              const quoteMatch = /^([ ]{0,3}\>[ ]?)+/.exec(line.text)
              formatCharOffset = quoteMatch !== null ? quoteMatch[0].length : 0
            } else if (node.name === 'BulletList' || node.name === 'OrderedList') {
              const listMatch = /^\s*((?:[+*>-](?:\s\[[x\s]\])?|\d+\.)\s)/.exec(line.text)
              formatCharOffset = listMatch !== null ? listMatch[1].length : 0
            }

            const columnLineTextStart = leadingWhitespace + formatCharOffset

            if (columnLineTextStart === 0) {
              continue // Neither whitespace nor list elements on that line.
            }

            // Now that we know we need to indent this line, schedule a measurement so
            // that in the next round of this code running we have an accurate
            // indentation even for non-monospaced text. What we want to measure is
            // exclusively what we are basing our indentation on. If we use the entire
            // line as a key, we cause (a) duplicated measurements (`* One` and `* Two`
            // require the same indentation) and (b) cause cache misses which results in
            // jumpy behavior when the user adds novel characters to the line.
            const measurementKey = line.text.slice(0, columnLineTextStart).replace('\t', ' '.repeat(view.state.tabSize))

            view.requestMeasure({
              read (view) {
                const pos = line.from + columnLineTextStart

                const folded = foldedRanges(view.state).iter(pos)
                while (folded.value) {
                  if (pos < folded.to) { return }
                  folded.next()
                }

                const base = view.contentDOM.getBoundingClientRect().left
                const after = view.coordsAtPos(pos)?.left ?? 0
                if (after === 0) {
                  return // Could not retrieve coordinates
                }
                // Note that this continuously updates our measurements after any layout
                // changes
                measurements?.set(measurementKey, after - base)
              },
              key: measurementKey
            })

            let indent = measurements?.get(measurementKey)
            if (indent !== undefined) {
              // NOTE: Each `.cm-line` has a padding of `0 2px 0 6px` as per CodeMirror's
              // base styles from somewhere in the library. We need to account for that
              // not to induce any problems.
              const basePadding = 6
              const deco = Decoration.line({ attributes: { style: `text-indent: -${indent-basePadding}px; padding-left: ${indent}px;` } })
              ranges.push(deco.range(line.from))
            }
          }

          return false
        }
      }
    })
  }

  return Decoration.set(ranges, true)
}

export const softwrapVisualIndent = ViewPlugin.define(view => ({
  decorations: render(view),
  tabDecorations: tabReplaceDeco.createDeco(view),
  // This is an additional property, required to ensure that each editor
  // instance has its own map, preventing any potential interference.
  measurements: new Map<string, number>(),
  update (u: ViewUpdate) {
    this.decorations = render(u.view, this.measurements)
    this.tabDecorations = tabReplaceDeco.updateDeco(u, this.tabDecorations)
  }
}), {

  decorations (value) {
    return RangeSet.join([ value.decorations, value.tabDecorations ])
  }

})
