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
import { EditorState, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import markdownParser from 'source/common/modules/markdown-editor/parser/markdown-parser'
import { addRowAfter } from 'source/common/modules/markdown-editor/table-editor/commands/rows'

const TABLE = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |'

const tableTests: Array<{
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

function addRowToState (doc: string, cursor: number): { changed: boolean, state: EditorState } {
  let state = EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [ markdownParser() ]
  })
  const target = {
    get state () { return state },
    dispatch (...specs: TransactionSpec[]) {
      state = state.update(...specs).state
    }
  } as unknown as EditorView

  return { changed: addRowAfter(target), state }
}

describe('TableEditor#addRowAfter()', function () {
  for (let i = 0; i < tableTests.length; i++) {
    const { desc, cursor, newRowLine, column } = tableTests[i]
    it(`Should place the cursor in the new row when the cursor is ${desc}`, function () {
      const { changed, state } = addRowToState(TABLE, cursor)

      strictEqual(changed, true)
      const line = state.doc.line(newRowLine)
      strictEqual(line.text, '|  |  |')
      strictEqual(state.selection.main.head, line.from + column)
    })
  }

})
