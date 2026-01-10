/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        renderPandoc
 * CVM-Role:        View
 * Maintainer:      Bennie Milburn
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays Pandoc spans using
 *                  Decorations and Pandoc Divs using BlockWrappers,
 *                  rendering the attributes defined for the node as
 *                  they would be displayed by pandoc
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import type { Range, RangeSet } from '@codemirror/state'
import { BlockWrapper, Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { parsePandocAttributes } from 'source/common/pandoc-util/parse-pandoc-attributes'
import { rangeInSelection } from '../util/range-in-selection'
import { configField } from '../util/configuration'

function showSpanDecorations (view: EditorView): RangeSet<Decoration> {
  const ranges: Range<Decoration>[] = []

  const includeAdjacent = view.state.field(configField, false)?.previewModeShowSyntaxWhenCursorIsAdjacent ?? true

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (rangeInSelection(view.state.selection, node.from, node.to, includeAdjacent)) {
          return
        }

        if (node.name !== 'PandocSpan') {
          return
        }

        const marks = node.node.getChildren('PandocSpanMark')
        const attrs = node.node.getChild('PandocAttribute')

        // Pandoc spans must have an attribute node
        if (!attrs) {
          return
        }

        // Something went wrong
        if (marks.length !== 2) {
          return
        }

        // Parse the classes and other attributes to render in the decoration.
        const attributes = parsePandocAttributes(view.state.sliceDoc(attrs.from, attrs.to))
        const classes = attributes.classes ?? []
        const id = attributes.id ?? ''

        const deco = Decoration.mark({
          attributes: {
            id,
            class: classes.join(' '),
            ...attributes.properties,
          },
        })

        // Only style the text within the marks
        const from = marks[0].to
        const to = marks[1].from

        ranges.push(deco.range(from, to))
      }
    })
  }

  return Decoration.set(ranges, true)
}

const overrideWrapper = BlockWrapper.create({ tagName: 'pandoc-div-info-wrapper' })

function showDivDecorations (view: EditorView): RangeSet<BlockWrapper> {
  const ranges: Range<BlockWrapper>[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (rangeInSelection(view.state.selection, node.from, node.to, true)) {
          return
        }

        if (node.name !== 'PandocDiv') {
          return
        }

        const marks = node.node.getChildren('PandocDivMark')
        const attrs = node.node.getChild('PandocAttribute')
        const info = node.node.getChild('PandocDivInfo')

        // Pandoc divs must have at least an info or an attribute node
        if (!attrs && !info) {
          return
        }

        // Something went wrong
        if (marks.length !== 2) {
          return
        }

        const attributes = attrs ? parsePandocAttributes(view.state.sliceDoc(attrs.from, attrs.to)) : {}
        const classes = attributes.classes ?? []
        const id = attributes.id ?? ''

        if (info) {
          classes.unshift(view.state.sliceDoc(info.from, info.to))
        }

        const wrapper = BlockWrapper.create({
          tagName: 'pandoc-div-wrapper',
          attributes: {
            id,
            class: classes.join(' '),
            ...attributes.properties,
          },
        })

        // Only style the content within the marks
        const fromLine = view.state.doc.lineAt(node.from)
        const toLine = view.state.doc.lineAt(node.to)

        const from = fromLine.to + 1
        const to = toLine.from - 1

        ranges.push(wrapper.range(from, to))
        ranges.push(overrideWrapper.range(fromLine.from, fromLine.to))
        ranges.push(overrideWrapper.range(toLine.from, toLine.to))
      }
    })
  }

  return BlockWrapper.set(ranges, true)
}

const pandocDivSpanPlugin = ViewPlugin.fromClass(class {
  spanDecorations: DecorationSet
  divWrappers: RangeSet<BlockWrapper>

  constructor (view: EditorView) {
    this.spanDecorations = showSpanDecorations(view)
    this.divWrappers = showDivDecorations(view)
  }

  update (update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.spanDecorations = showSpanDecorations(update.view)
      this.divWrappers = showDivDecorations(update.view)
    }
  }

}, {
  decorations: v => v.spanDecorations,
  provide: plugin => EditorView.blockWrappers.of((view) => {
    return view.plugin(plugin)?.divWrappers ?? BlockWrapper.set([])
  })
})

export const renderPandoc = [
  pandocDivSpanPlugin,
  // The classes `.mark`, `.underline`, and `.smallcaps` are used by pandoc
  EditorView.baseTheme({
    // This must be set to `display: block` so that the
    // attributes are applied correctly.
    'pandoc-div-wrapper': {
      display: 'block'
    },
    'pandoc-div-info-wrapper': {
      display: 'block',
      fontSize: '18px',
      fontWeight: 'initial',
      fontVariant: 'initial',
      color: 'initial',
      backgroundColor: '#ffffff',
    },
    '&dark pandoc-div-info-wrapper': {
      backgroundColor: '#2b2b2c',
    },
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
