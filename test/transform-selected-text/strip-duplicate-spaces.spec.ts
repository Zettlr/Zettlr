/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the stripDuplicateSpaces function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the stripDuplicateSpaces function.
 *
 * END HEADER
 */

import { stripDuplicateSpaces } from 'source/common/modules/markdown-editor/commands/transforms/strip-duplicate-spaces'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#stripDuplicateSpaces()', function () {
  const sunnyDayTestCases = [
    {
      input: 'Duplicate (  ) spaces',
      expectedOutput: 'Duplicate ( ) spaces',
      expectedLengthAfterStripping: 20
    },
    {
      input: 'Duplicate (  ) spaces and again (     ) and again (  ) ',
      expectedOutput: 'Duplicate ( ) spaces and again ( ) and again ( ) ',
      expectedLengthAfterStripping: 49
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

      stripDuplicateSpaces({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  const rainyDayTestCases = [
    {
      input: 'There are no duplicate spaces in this text',
    },
    {
      input: 'No duplicate spaces but \t \t\t there are duplicate tabs',
    }
  ]

  rainyDayTestCases.forEach(({ input }) => {
    it(`given "${input}" no transaction is dispatched`, function () {
      const state = EditorState.create({
        doc: input,
        selection: selectAll(input),
      })

      const dispatch = () => fail('No transaction must be dispatched')

      stripDuplicateSpaces({ state, dispatch })
    })
  })

  it('given text with no duplicate spaces and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no duplicate spaces in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    stripDuplicateSpaces({ state, dispatch })
  })

  it('given text with two duplicate spaces but those dupes are not in the selected text then no transaction is dispatched', function () {
    const text = 'Duplicate (  ) spaces'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include the dupes
        EditorSelection.range(0, 8),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    stripDuplicateSpaces({ state, dispatch })
  })
})
