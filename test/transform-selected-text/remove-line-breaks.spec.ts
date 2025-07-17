/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the removeLineBreaks function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the removeLineBreaks function.
 *
 * END HEADER
 */

import { removeLineBreaks } from 'source/common/modules/markdown-editor/commands/transforms/remove-line-breaks'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#removeLineBreaks()', function () {
  const sunnyDayTestCases = [
    {
      input: 'How\nhappy I am that I am gone!',
      expectedOutput: 'How happy I am that I am gone!',
      expectedLengthAfterStripping: 30
    },
    {
      input: 'How    \n  happy I am that I am gone!',
      expectedOutput: 'How happy I am that I am gone!',
      expectedLengthAfterStripping: 30
    },
    {
      input: 'How \n happy  \nI\nam \n                that I am gone!',
      expectedOutput: 'How happy I am that I am gone!',
      expectedLengthAfterStripping: 30
    }
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

      removeLineBreaks({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text with no line breaks and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no line breaks in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    removeLineBreaks({ state, dispatch })
  })

  it('given text with line breaks but that region is not in the selected text then no transaction is dispatched', function () {
    const text = 'How happy \nI\nam\nthat I am\n gone!'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include any line breaks
        EditorSelection.range(0, 3),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    removeLineBreaks({ state, dispatch })
  })
})
