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

import { doesNotThrow, ok, strictEqual } from 'assert'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import markdownParser from 'source/common/modules/markdown-editor/parser/markdown-parser'
import { addRowAfter } from 'source/common/modules/markdown-editor/table-editor/commands/rows'

// The jsdom environment (see test/setup.js) does not provide requestAnimationFrame,
// which the CodeMirror EditorView requires upon construction.
window.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number
window.cancelAnimationFrame = (id: number) => clearTimeout(id)

/**
 * Creates an editor view containing a Markdown table and places the cursor at
 * the given document offset.
 *
 * @param   {string}      doc   The document contents
 * @param   {number}      head  The cursor position
 *
 * @return  {EditorView}        The editor view
 */
function createView (doc: string, head: number): EditorView {
  const state = EditorState.create({ doc, extensions: [markdownParser()] })
  const view = new EditorView({ state, parent: document.body })
  view.dispatch({ selection: { anchor: head } })
  return view
}

const TABLE = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |'

describe('TableEditor#addRowAfter()', function () {
  it('should append an empty row after the last row', function () {
    const view = createView(TABLE, 36) // Cursor inside the last row
    const changed = addRowAfter(view)

    ok(changed)
    strictEqual(view.state.doc.toString(), `${TABLE}\n|  |  |`)
  })

  it('should place the cursor at the same column in the new row', function () {
    // The last row "| 3 | 4 |" starts at offset 34; the cursor at offset 36
    // sits in the first cell ("3"), two characters in.
    const view = createView(TABLE, 36)
    addRowAfter(view)

    // The new row starts at offset 44 (after the inserted newline), so the
    // same column is offset 46.
    strictEqual(view.state.selection.main.head, 46)
  })

  it('should not throw when the cursor is at the very end of the document', function () {
    // Previously the selection was moved by the line length, which pushed the
    // resulting selection past the end of the document and threw a RangeError.
    const view = createView(TABLE, TABLE.length)
    let changed = false

    doesNotThrow(() => {
      changed = addRowAfter(view)
    })

    ok(changed)
    strictEqual(view.state.doc.toString(), `${TABLE}\n|  |  |`)
  })

  it('should add a row after the delimiter when the cursor is in the header', function () {
    const view = createView(TABLE, 2) // Cursor inside the header row
    const changed = addRowAfter(view)

    ok(changed)
    strictEqual(view.state.doc.toString(), '| A | B |\n| --- | --- |\n|  |  |\n| 1 | 2 |\n| 3 | 4 |')
  })
})
