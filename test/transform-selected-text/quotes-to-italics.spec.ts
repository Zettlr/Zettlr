/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the quotesToItalics function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the quotesToItalics function.
 *
 * END HEADER
 */

import { quotesToItalics } from 'source/common/modules/markdown-editor/commands/transforms/quotes-to-italics'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'
import { EditorConfiguration } from 'source/common/modules/markdown-editor/util/configuration'

type ItalicFormatting = EditorConfiguration['italicFormatting'];

describe('MarkdownEditor#quotesToItalics()', function () {
  const sunnyDayTestCases = [
    {
      input: '"Cultures in Orbit"',
      expectedOutput: '_Cultures in Orbit_',
      italicFormattingCharacter: '_' as ItalicFormatting,
      expectedLengthAfterStripping: 19
    },
    {
      input: '"Cultures in Orbit" and "Cultures in Orbit"',
      expectedOutput: '_Cultures in Orbit_ and _Cultures in Orbit_',
      italicFormattingCharacter: '_' as ItalicFormatting,
      expectedLengthAfterStripping: 43
    },
    {
      input: '"Cultures in Orbit"',
      expectedOutput: '*Cultures in Orbit*',
      italicFormattingCharacter: '*' as ItalicFormatting,
      expectedLengthAfterStripping: 19
    },
    {
      input: '"Cultures in Orbit" and "Cultures in Orbit"',
      expectedOutput: '*Cultures in Orbit* and *Cultures in Orbit*',
      italicFormattingCharacter: '*' as ItalicFormatting,
      expectedLengthAfterStripping: 43
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

      quotesToItalics(testCase.italicFormattingCharacter)({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text with no quoted regions and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no quoted regions in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    quotesToItalics('_')({ state, dispatch })
  })

  it('given text with a quoted region but that region is not in the selected text then no transaction is dispatched', function () {
    const text = 'Tricky "Cultures in Orbit"'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include the italicized region
        EditorSelection.range(0, 6),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    quotesToItalics('_')({ state, dispatch })
  })
})
