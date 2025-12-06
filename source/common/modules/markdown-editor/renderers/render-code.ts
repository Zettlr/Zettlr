/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Code syntax renderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Apply syntax highlighting to code elements
 *
 * END HEADER
 */

import type { Range, RangeSet } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const codeDecorator = Decoration.mark({ class: 'code' })

/**
 * Creates a StateField that applies the class `code` to all code spans. It
 * additionally applies the class `code-block-line` to all lines which are part
 * of an entire code block
 *
 * @return  {StateField}  The StateField
 */
function getCodeHighlighter (view: EditorView):  RangeSet<Decoration> {
  const ranges: Range<Decoration>[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        // CodeText contains a single node that has all the code's contents
        if (node.name === 'CodeText' || node.name === 'InlineCode') {
          ranges.push(codeDecorator.range(node.from, node.to))
          return false
        }
      }
    })
  }

  return Decoration.set(ranges, true)
}

const renderCodePlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor (view: EditorView) {
    this.decorations = getCodeHighlighter(view)
  }

  update (update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = getCodeHighlighter(update.view)
    }
  }
}, {
  decorations: v => v.decorations
})

const codeTheme = EditorView.baseTheme({
  // We're using this solarized theme here: https://ethanschoonover.com/solarized/
  '.code': {
    color: '#93a1a1',
    fontFamily: 'Inconsolata, monospace'
  },
  '.code :is(.cm-string, cm-keyword, .cm-inserted, .cm-positive)': { color: '#859900' },
  '.code :is(.cm-atom, .cm-number, .cm-meta)': { color: '#6c71c4' },
  '.code :is(.cm-tag-name, .cm-modifier, .cm-variable-name, .cm-variable)': { color: '#2aa198' },
  '.code :is(.cm-qualifier, .cm-builtin, .cm-property-name)': { color: '#268bd2' },
  '.code :is(.cm-attribute-name, .cm-deleted)': { color: '#cb4b16' },
  '.code :is(.cm-keyword, .cm-name, .cm-type-name, .cm-changed)': { color: '#b58900' },
  '.code .cm-property': { color: '#d33682' },
  '.code .cm-comment': { color: '#93a1a1' },
  '.code .cm-negative': { color: '#dc322f' },
})

export const renderCode = [
  renderCodePlugin,
  codeTheme,
]
