/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        renderPandoc
 * CVM-Role:        View
 * Maintainer:      Bennie Milburn
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays Pandoc divs and spans using
 *                  Decorations, rendering the attributes defined for
 *                  the node as they would be displayed by pandoc
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import type { Range, RangeSet } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { parseLinkAttributes } from 'source/common/pandoc-util/parse-link-attributes'
import { rangeInSelection } from '../util/range-in-selection'

function showDivSpanDecorations (view: EditorView): RangeSet<Decoration> {
  const ranges: Range<Decoration>[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (rangeInSelection(view.state.selection, node.from, node.to, true)) {
          return
        }

        let marks
        let attrs
        let info

        let from
        let to

        switch (node.name) {
          case 'PandocSpan': {
            marks = node.node.getChildren('PandocSpanMark')
            attrs = node.node.getChild('PandocAttribute')

            // Pandoc spans must have an attribute node
            if (!attrs) {
              return
            }

            // Something went wrong
            if (marks.length !== 2) {
              return
            }

            // Only style the text within the marks
            from = marks[0].to
            to = marks[1].from
            break
          }

          case 'PandocDiv': {
            marks = node.node.getChildren('PandocDivMark')
            attrs = node.node.getChild('PandocAttribute')
            info = node.node.getChild('PandocDivInfo')

            // Pandoc divs must have at least an info or an attribute node
            if (!attrs && !info) {
              return
            }

            // Something went wrong
            if (marks.length !== 2) {
              return
            }

            // Only style the lines within the marks
            from = view.state.doc.line(view.state.doc.lineAt(node.from).number).to
            to = view.state.doc.line(view.state.doc.lineAt(node.to).number).from
            break
          }

          default: return
        }

        // Parse the classes and other attributes to render in the decoration.
        const attributes = attrs ? parseLinkAttributes(view.state.sliceDoc(attrs.from, attrs.to)) : {}
        const classes = attributes.classes ?? []
        const id = attributes.id ?? ''

        if (info) {
          classes.unshift(view.state.sliceDoc(info.from, info.to))
        }

        const deco = Decoration.mark({
          attributes: {
            id,
            class: classes.join(' '),
            ...attributes.properties,
          },
        })

        ranges.push(deco.range(from, to))
      },
    })
  }

  return Decoration.set(ranges, true)
}

const pandocDivSpanPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = showDivSpanDecorations(view)
  }

  update (update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = showDivSpanDecorations(update.view)
    }
  }

}, {
  decorations: v => v.decorations
})

export const renderPandoc = [
  pandocDivSpanPlugin,
  // The classes `.mark`, `.underline`, and `.smallcaps` are used by pandoc
  EditorView.baseTheme({
    '.mark .cm-pandoc-span': {
      backgroundColor: '#ffff0080',
    },
    '&dark .mark .cm-pandoc-span': {
      backgroundColor: '#ffff0060',
    },
    '.underline .cm-pandoc-span': {
      textDecoration: 'underline',
    },
    '.smallcaps .cm-pandoc-span': {
      fontVariantCaps: 'small-caps',
    }
  })
]
