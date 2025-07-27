/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the toSentenceCase function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the toSentenceCase function.
 *
 * END HEADER
 */

import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { toSentenceCase } from 'source/common/modules/markdown-editor/commands/transforms/to-sentence-case'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#toSentenceCase()', function () {
  const sunnyDayTestCases = [
    {
      input: 'A Review of the Literature',
      expectedOutput: 'A review of the literature',
      expectedLengthAfterStripping: 26
    },
    {
      input: 'a',
      expectedOutput: 'A',
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

      toSentenceCase('en-GB')({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'A Review of the Literature'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    toSentenceCase('en-GB')({ state, dispatch })
  })

  it('given text but the relevant text is not in the selected text then no transaction is dispatched because nothing is selected', function () {
      const text = 'A Review of the Literature'

      const state = EditorState.create({
        doc: text,
        selection: EditorSelection.create([
          // select just the first word which is already capitalized
          EditorSelection.range(0, 1),
        ]),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    toSentenceCase('en-GB')({ state, dispatch })
  })

  it('given text that is already in sentence case then no transaction is dispatched because nothing is selected', function () {
    const text = 'A review of the literature'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toSentenceCase('en-GB')({ state, dispatch })
  })
})
