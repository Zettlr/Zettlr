/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the removeSpacesAroundEmdashes function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the removeSpacesAroundEmdashes function.
 *
 * END HEADER
 */

import { removeSpacesAroundEmdashes } from 'source/common/modules/markdown-editor/commands/transforms/remove-spaces-around-emdashes'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#removeSpacesAroundEmdashes()', function () {
  const sunnyDayTestCases = [
    {
      input: 'blush — curious',
      expectedOutput: 'blush—curious',
      expectedLengthAfterStripping: 13
    },
    {
      input: 'blush —curious',
      expectedOutput: 'blush—curious',
      expectedLengthAfterStripping: 13
    },
    {
      input: 'blush— curious',
      expectedOutput: 'blush—curious',
      expectedLengthAfterStripping: 13
    },
    {
      input: 'blush      —      curious',
      expectedOutput: 'blush—curious',
      expectedLengthAfterStripping: 13
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

      removeSpacesAroundEmdashes({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text with no emdashes and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no emdashes in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    removeSpacesAroundEmdashes({ state, dispatch })
  })

  it('given text with no emdashes and all the text is selected then no transaction is dispatched because nothing is selected', function () {
      const text = 'There are no emdashes in this text'

      const state = EditorState.create({
        doc: text,
        selection: selectAll(text),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    removeSpacesAroundEmdashes({ state, dispatch })
  })

  it('given text with emdashes that are already unspaced then no transaction is dispatched', function () {
    const text = 'blush—curious'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    removeSpacesAroundEmdashes({ state, dispatch })
  })

  it('given text with emdashes that need unspacing but the emdash-y bit is not in the selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'nope blush — curious',
        selection: EditorSelection.create([
          // select just the first word which *doesn't* include the emdash-y bit
          EditorSelection.range(0, 4),
        ]),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    removeSpacesAroundEmdashes({ state, dispatch })
  })
})
