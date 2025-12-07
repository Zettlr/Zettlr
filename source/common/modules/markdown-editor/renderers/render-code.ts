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


/* Code Theme
 *
 * We're using this solarized theme here: https://ethanschoonover.com/solarized/
 * See also the CodeEditor.vue component, which uses the same colours
*/

// const BASE_0 = '#839496'
const BASE_1 = '#93a1a1'
// const BASE_2 = '#eee8d5'
// const BASE_3 = '#fdf6e3'
// const BASE_00 = '#657b83'
// const BASE_01 = '#586e75'
// const BASE_02 = '#073642'
// const BASE_03 = '#002b36'

const YELLOW = '#b58900'
const ORANGE = '#cb4b16'
const RED = '#dc322f'
const MAGENTA = '#d33682'
const VIOLET = '#6c71c4'
const BLUE = '#268bd2'
const CYAN = '#2aa198'
const GREEN = '#859900'

const codeTheme = EditorView.baseTheme({

  '.code': {
    color: BASE_1,
    fontFamily: 'Inconsolata, monospace'
  },
  '.code .cm-string': { color: GREEN },
  '.code .cm-keyword': { color: GREEN },
  '.code .cm-inserted': { color: GREEN },
  '.code .cm-positive': { color: GREEN },
  '.code .cm-atom': { color: VIOLET },
  '.code .cm-number': { color: VIOLET },
  '.code .cm-meta': { color: VIOLET },
  '.code .cm-tag-name': { color: CYAN },
  '.code .cm-modifier': { color: CYAN },
  '.code .cm-variable-name': { color: CYAN },
  '.code .cm-variable': { color: CYAN },
  '.code .cm-qualifier': { color: BLUE },
  '.code .cm-builtin': { color: BLUE },
  '.code .cm-property-name': { color: BLUE },
  '.code .cm-attribute-name': { color: ORANGE },
  '.code .cm-deleted': { color: ORANGE },
  '.code .cm-name': { color: YELLOW },
  '.code .cm-type-name': { color: YELLOW },
  '.code .cm-changed': { color: YELLOW },
  '.code .cm-property': { color: MAGENTA },
  '.code .cm-comment': { color: BASE_1 },
  '.code .cm-block-comment': { color: BASE_1 },
  '.code .cm-negative': { color: RED },
})

export const renderCode = [
  renderCodePlugin,
  codeTheme,
]
