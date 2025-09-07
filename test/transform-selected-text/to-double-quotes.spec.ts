/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the toDoubleQuotes function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the toDoubleQuotes function.
 *
 * END HEADER
 */

import { toDoubleQuotes } from 'source/common/modules/markdown-editor/commands/transforms/to-double-quotes'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#toDoubleQuotes()', function () {
  const sunnyDayTestCases = [
    {
      input: 'Oh \'such\' joy',
      expectedOutput: 'Oh "such" joy',
      expectedLengthAfterStripping: 13
    },
    {
      input: 'Oh `such` joy',
      expectedOutput: 'Oh "such" joy',
      expectedLengthAfterStripping: 13
    },
    {
      input: 'Oh `such` joy & Oh `such` joy',
      expectedOutput: 'Oh "such" joy & Oh "such" joy',
      expectedLengthAfterStripping: 29
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

      toDoubleQuotes({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text with no quotes of any kind and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no quotes in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    toDoubleQuotes({ state, dispatch })
  })

  it('given text with no quotes of any kind and all text is selected then no transaction is dispatched', function () {
    const text = 'There are no quotes in this text'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toDoubleQuotes({ state, dispatch })
  })

  it('given text with an unpaired single quote and all text is selected then no transaction is dispatched', function () {
    const text = 'This \' is not paired'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toDoubleQuotes({ state, dispatch })
  })

  it('given text with an unpaired backtick and all text is selected then no transaction is dispatched', function () {
    const text = 'This ` is not paired'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toDoubleQuotes({ state, dispatch })
  })

  it('given text with paired backticks but those backticks are not in the selected text then no transaction is dispatched', function () {
    const text = 'Oh `such` joy'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include any quotes
        EditorSelection.range(0, 2),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toDoubleQuotes({ state, dispatch })
  })

  it('given text with paired single quotes but those backticks are not in the selected text then no transaction is dispatched', function () {
    const text = 'Oh \'such\' joy'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include any quotes
        EditorSelection.range(0, 2),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    toDoubleQuotes({ state, dispatch })
  })
})
