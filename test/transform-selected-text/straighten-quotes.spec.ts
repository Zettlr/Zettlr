/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the straightenQuotes function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the straightenQuotes function.
 *
 * END HEADER
 */

import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { straightenQuotes } from 'source/common/modules/markdown-editor/commands/transforms/straighten-quotes'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#straightenQuotes()', function () {
  const sunnyDayTestCases = [
    {
      input: '“ ‘ ’ ”',
      expectedOutput: `" ' ' "`,
      expectedLengthAfterStripping: 7
    },
    {
      input: ' “ ‘ ’ ”“ ‘ ’ ”“ ‘ ’ ” ',
      expectedOutput: ` " ' ' "" ' ' "" ' ' " `,
      expectedLengthAfterStripping: 23
    },
    {
      input: `Ein „deutscher Testsatz mit ‚Anführungszeichen‘.“`,
      expectedOutput: `Ein "deutscher Testsatz mit 'Anführungszeichen'."`,
      expectedLengthAfterStripping: 49
    },
    {
      input: `Un «exemple de phrase en français» avec des ‹guillemets›.`,
      expectedOutput: `Un "exemple de phrase en français" avec des 'guillemets'.`,
      expectedLengthAfterStripping: 57
    },
    {
      input: `En svensk ”exempelmening med ’citattecken’”.`,
      expectedOutput: `En svensk "exempelmening med 'citattecken'".`,
      expectedLengthAfterStripping: 44
    },
    {
      input: `I'm lacking the language skills, but 「Japanese」 or 『Taiwanese』 quotation marks.`,
      expectedOutput: `I'm lacking the language skills, but "Japanese" or 'Taiwanese' quotation marks.`,
      expectedLengthAfterStripping: 79
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

      straightenQuotes({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('given text with no quotes and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no quotes in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    straightenQuotes({ state, dispatch })
  })

  it('given text with no quotes and all the text is selected then no transaction is dispatched because nothing is selected', function () {
      const text = 'There are no single quotes in this text'

      const state = EditorState.create({
        doc: text,
        selection: selectAll(text),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    straightenQuotes({ state, dispatch })
  })

  it('given text with curly quotes but those quotes are not in the selected text then no transaction is dispatched because nothing is selected', function () {
      const text = 'Huzzah “ ‘ ’ ”'

      const state = EditorState.create({
        doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include any quotes
        EditorSelection.range(0, 5),
      ]),
      })

    const dispatch = () => fail('No transaction must be dispatched')

    straightenQuotes({ state, dispatch })
  })
})
