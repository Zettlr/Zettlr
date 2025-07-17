/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the toTitleCase function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the toTitleCase function.
 *
 * END HEADER
 */

import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { toTitleCase } from 'source/common/modules/markdown-editor/commands/transforms/to-title-case'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#toTitleCase()', function () {
  const sunnyDayTestCases = [
    {
      input: 'A review of the literature',
      expectedOutput: 'A Review Of The Literature',
      expectedLengthAfterStripping: 26
    },
    {
      input: 'a',
      expectedOutput: 'A',
      expectedLengthAfterStripping: 1
    },
    {
      input: 'A review ✌️ of The Literature',
      expectedOutput: 'A Review ✌️ Of The Literature',
      expectedLengthAfterStripping: 29
    },
    {
      // checking graphemes
      input: 'A review of ह Literature',
      expectedOutput: 'A Review Of ह Literature',
      expectedLengthAfterStripping: 24
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

      toTitleCase('en-GB')({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'A review of the literature'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    toTitleCase('en-GB')({ state, dispatch })
  })

  it('given text but the relevant text is not in the selected text then no transaction is dispatched because nothing is selected', function () {
      const text = 'A review of the literature'

      const state = EditorState.create({
        doc: text,
        selection: EditorSelection.create([
          // select just the first word which is already capitalized
          EditorSelection.range(0, 1),
        ]),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    toTitleCase('en-GB')({ state, dispatch })
  })

  it('given text that is already in title case then no transaction is dispatched because nothing needs changing', function () {
    const text = 'A Review Of The Literature'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toTitleCase('en-GB')({ state, dispatch })
  })
})
