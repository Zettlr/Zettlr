/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the singleQuotesToDouble function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the singleQuotesToDouble function.
 *
 * END HEADER
 */

import { singleQuotesToDouble } from 'source/common/modules/markdown-editor/commands/transforms/single-quotes-to-double-quotes'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#singleQuotesToDouble()', function () {
  const sunnyDayTestCases = [
    {
      input: '\'I love you,\' said Elric',
      expectedOutput: '"I love you," said Elric',
      expectedLengthAfterStripping: 24
    },
    {
      input: '\'\'\'',
      expectedOutput: '"""',
      expectedLengthAfterStripping: 3
    },
    {
      input: '\'',
      expectedOutput: '"',
      expectedLengthAfterStripping: 1
    },
  ]

  sunnyDayTestCases.forEach((testCase) => {
    it(`given "${testCase.input}" ➡️ "${testCase.expectedOutput}"`, function () {
      const state = EditorState.create({
        doc: testCase.input,
        selection: selectAll(testCase.input),
      })

      let wasDispatched = false

      const dispatch = (tx: Transaction) => {
        wasDispatched = true

        deepEqual(tx.changes, {
          inserted: [
            {
              length: testCase.expectedLengthAfterStripping,
              text: [testCase.expectedOutput]
            }
          ],
          sections: [
            testCase.input.length,
            testCase.expectedLengthAfterStripping
          ]
        })
      }

      singleQuotesToDouble({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text with no single quotes and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no single quotes in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    singleQuotesToDouble({ state, dispatch })
  })

  it('given text with no single quotes and all the text is selected then no transaction is dispatched because nothing is selected', function () {
      const text = 'There are no single quotes in this text'

      const state = EditorState.create({
        doc: text,
        selection: selectAll(text),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    singleQuotesToDouble({ state, dispatch })
  })
})
