/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        renderBlockquotes
 * CVM-Role:        View
 * Maintainer:      Bennie Milburn
 * License:         GNU GPL v3
 *
 * Description:     This renderer adds a vertical bar
 *                  to the left edge of blockquotes
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import type { Range, RangeSet } from '@codemirror/state'
import { BlockWrapper, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'
import { rangeInSelection } from '../util/range-in-selection'
import type { SyntaxNode } from '@lezer/common'

function showBlockquoteWrappers (view: EditorView): RangeSet<BlockWrapper> {
  const ranges: Range<BlockWrapper>[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from, to,
      enter: (node) => {
        if (rangeInSelection(view.state.selection, node.from, node.to, true)) {
          return
        }

        if (node.name !== 'Blockquote') {
          return
        }

        let parent: SyntaxNode|null = node.node.parent
        let parentNode

        while (parent) {
          if (parent.name === 'Blockquote') {
            parentNode = parent.node
          }
          parent = parent.parent
        }

        if (parentNode && rangeInSelection(view.state.selection, parentNode.from, parentNode.to, true)) {
          return
        }

        const line = view.state.doc.lineAt(node.from)
        const wrapper = BlockWrapper.create({
          tagName: 'blockquote-wrapper',
          attributes: {
            class: 'blockquote-wrapper',
          }
        })

        ranges.push(wrapper.range(line.from, node.to))
      },
    })
  }

  return BlockWrapper.set(ranges, true)
}

const blockquotePlugin = ViewPlugin.fromClass(class {
  blockWrappers: RangeSet<BlockWrapper>

  constructor (view: EditorView) {
    this.blockWrappers = showBlockquoteWrappers(view)
  }

  update (update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.blockWrappers = showBlockquoteWrappers(update.view)
    }
  }

}, {
  provide: plugin => EditorView.blockWrappers.of(view => view.plugin(plugin)?.blockWrappers as RangeSet<BlockWrapper>|undefined || BlockWrapper.set([]))
})

export const renderBlockquotes = [
  blockquotePlugin,
  EditorView.baseTheme({
    '.blockquote-wrapper': {
      display: 'block',
      borderLeft: 'solid 0.25em',
      paddingLeft: '0.5em',
      marginLeft: '0.25em'
    },
    '.blockquote-wrapper .cm-line': {
      opacity: '0.7',
      // We need to revert these stylings set by the
      // visual-indent plugin since they conflict with
      // the paddingLeft set by the blockquote-wrapper.
      paddingLeft: 'revert !important',
      textIndent: 'revert !important'
    }
  })
]
