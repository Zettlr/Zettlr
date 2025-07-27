/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the italicsToQuotes function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the italicsToQuotes function.
 *
 * END HEADER
 */

import { italicsToQuotes } from 'source/common/modules/markdown-editor/commands/transforms/italics-to-quotes'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#italicsToQuotes()', function () {
  const sunnyDayTestCases = [
    {
      input: '_Cultures in Orbit_',
      expectedOutput: '"Cultures in Orbit"',
      expectedLengthAfterStripping: 19
    },
    {
      // different italic control characters to the first
      input: '*Cultures in Orbit*',
      expectedOutput: '"Cultures in Orbit"',
      expectedLengthAfterStripping: 19
    },
    {
      input: '_Cultures in Orbit_ and _Cultures in Orbit_',
      expectedOutput: '"Cultures in Orbit" and "Cultures in Orbit"',
      expectedLengthAfterStripping: 43
    },
    {

      // mix of different italic control characters
      input: '*Cultures in Orbit* and _Cultures in Orbit_',
      expectedOutput: '"Cultures in Orbit" and "Cultures in Orbit"',
      expectedLengthAfterStripping: 43
    },
    {

      // nested and different italic control characters
      input: '_Cultures **in** Orbit_',
      expectedOutput: '"Cultures **in** Orbit"',
      expectedLengthAfterStripping: 23
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

      italicsToQuotes({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  const rainyDayTestCases = [
    {
      input: 'There are no italicized regions in this text',
    },
    {
      input: 'There are no italicized regions but there is a rogue _ character',
    },
    {
      input: 'There are no italicized regions but there is a rogue * character',
    }
  ]

  rainyDayTestCases.forEach(({ input }) => {
    it(`given "${input}" no transaction is dispatched`, function () {
      const state = EditorState.create({
        doc: input,
        selection: selectAll(input),
      })

      const dispatch = () => fail('No transaction must be dispatched')

      italicsToQuotes({ state, dispatch })
    })
  })

  it('given text with no italicized regions and no selected text then no transaction is dispatched because nothing is selected', function () {
      const state = EditorState.create({
        doc: 'There are no italicized regions in this text'
        // nothing selected
      })

    const dispatch = () => fail('No transaction must be dispatched')

    italicsToQuotes({ state, dispatch })
  })

  it('given text with an italicized region using "_" but that region is not in the selected text then no transaction is dispatched', function () {
    const text = 'Tricky _Cultures in Orbit_'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include the italicized region
        EditorSelection.range(0, 6),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    italicsToQuotes({ state, dispatch })
  })

  it('given text with an italicized region using "*" but that region is not in the selected text then no transaction is dispatched', function () {
    const text = 'Tricky *Cultures in Orbit*'

    const state = EditorState.create({
      doc: text,
      selection: EditorSelection.create([
        // select just the first word which *doesn't* include the italicized region
        EditorSelection.range(0, 6),
      ]),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    italicsToQuotes({ state, dispatch })
  })
})
