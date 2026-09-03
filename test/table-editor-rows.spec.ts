/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table editor row command tests
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests the row commands of the table editor.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import markdownParser from 'source/common/modules/markdown-editor/parser/markdown-parser'
import { addRowAfter } from 'source/common/modules/markdown-editor/table-editor/commands/rows'

// CodeMirror reads requestAnimationFrame off the view's own window on
// construction, and jsdom does not put it there (test/setup.js only sets the
// global).
window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number
window.cancelAnimationFrame = (id: number) => clearTimeout(id)

const TABLE = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |'

// addRowAfter only moves the selection; the row it inserts is the same either
// way. So each case pins where the cursor ends up: which line of the new
// document, and which column within it.
const table: Array<{
  desc: string
  cursor: number
  newRowLine: number
  column: number
}> = [
  {
    desc: 'in the last row',
    cursor: 36, // inside "3" in the last row
    newRowLine: 5,
    column: 2
  },
  {
    desc: 'at the very end of the document',
    // The old code shifted the selection by the line length, which landed
    // outside the document and threw "Selection points outside of document".
    cursor: TABLE.length,
    newRowLine: 5,
    column: 7 // clamped to the new row, which is shorter than the current one
  },
  {
    desc: 'in the header row',
    cursor: 2,
    newRowLine: 3, // the new row goes after the delimiter, not after the header
    column: 2
  }
]

describe('TableEditor#addRowAfter()', function () {
  for (let i = 0; i < table.length; i++) {
    const { desc, cursor, newRowLine, column } = table[i]
    it(`Should place the cursor in the new row when the cursor is ${desc}`, function () {
      const state = EditorState.create({ doc: TABLE, extensions: [markdownParser()] })
      const view = new EditorView({ state, parent: document.body })
      view.dispatch({ selection: { anchor: cursor } })

      strictEqual(addRowAfter(view), true)

      const line = view.state.doc.line(newRowLine)
      strictEqual(line.text, '|  |  |')
      strictEqual(view.state.selection.main.head, line.from + column)
    })
  }
})
