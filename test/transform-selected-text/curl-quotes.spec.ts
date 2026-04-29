/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the curlQuotes function
 * CVM-Role:        TESTING
 * Maintainers:     Wang Yile
 * License:         GNU GPL v3
 *
 * Description:     This file tests the curlQuotes function.
 *
 * END HEADER
 */

import { EditorState } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { curlQuotes } from 'source/common/modules/markdown-editor/commands/transforms/curl-quotes'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#curlQuotes()', function () {
  // Using en-US magic quotes: "…" and '…'
  const primary = '\u201c\u2026\u201d'
  const secondary = '\u2018\u2026\u2019'

  it('given straight double quotes, converts to curly double quotes', function () {
    const input = 'He said "hello" to her'
    const expectedOutput = 'He said \u201chello\u201d to her'

    const state = EditorState.create({
      doc: input,
      selection: selectAll(input),
    })

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given no quotes and no selection then no transaction is dispatched', function () {
    const state = EditorState.create({
      doc: 'There are no quotes in this text'
      // nothing selected
    })

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })
})
