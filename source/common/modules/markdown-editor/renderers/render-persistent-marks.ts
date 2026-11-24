/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Persistent Decoration Mark Renderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Applies additional styling via CSS classes in decorators to
 *                  various nodes which we can't style via another mechanism.
 *
 * END HEADER
 */

import type { Range, RangeSet } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

// Define classes to be used for the various spans
const codeDecorator = Decoration.mark({ class: 'code' })
const superscriptDecorator = Decoration.mark({ class: 'cm-superscript' })
const subscriptDecorator = Decoration.mark({ class: 'cm-subscript' })

/**
 * Apply decorations to all applicable nodes.
 *
 * @param   {EditorView}            view  The editor view
 *
 * @return  {RangeSet<Decoration>}        A full deco set
 */
function applyDecorations (view: EditorView): RangeSet<Decoration> {
  const ranges: Range<Decoration>[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        // CodeText contains a single node that has all the code's contents
        if ([ 'CodeText', 'InlineCode' ].includes(node.name)) {
          ranges.push(codeDecorator.range(node.from, node.to))
          return false
        } else if (node.type.is('Subscript')) {
          ranges.push(subscriptDecorator.range(node.from, node.to))
          return false
        } else if (node.type.is('Superscript')) {
          ranges.push(superscriptDecorator.range(node.from, node.to))
          return false
        }
      }
    })
  }

  return Decoration.set(ranges, true)
}

/**
 * A plugin that applies decorations to the various ranges for a given view.
 */
const renderDecorationsPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = applyDecorations(view)
  }

  update (update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = applyDecorations(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})

/**
 * A plugin that renders a set of nodes using CSS classes-in-decorators where we
 * can't apply styles in another way. See the source of the plugin to see which
 * nodes are styled this way.
 */
export const renderPersistentMarks = [
  renderDecorationsPlugin,
  EditorView.baseTheme({
    '.code': {
      color: 'var(--zettlr-editor-code-base-02)',
      fontFamily: 'var(--zettlr-editor-code-font)'
    },
    '&dark .code': {
      color: 'var(--zettlr-editor-code-base-1)'
    },
    '.cm-superscript, .cm-subscript': {
      fontSize: '0.8rem'
    },
    '.cm-superscript': {
      verticalAlign: 'super'
    },
    '.cm-subscript': {
      verticalAlign: 'sub'
    },
  })
]
