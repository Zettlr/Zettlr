/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the curlQuotes function
 * CVM-Role:        TESTING
 * Maintainers:     Wang Zilu and Jinyi Chen
 * License:         GNU GPL v3
 *
 * Description:     This file tests the curlQuotes function.
 *
 * END HEADER
 */

import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { curlQuotes } from 'source/common/modules/markdown-editor/commands/transforms/curl-quotes'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#curlQuotes()', function () {
  // Using en-US magic quotes: "\u201c\u201d" and "\u2018\u2019"
  const primary: [string, string] = ['\u201c', '\u201d']
  const secondary: [string, string] = ['\u2018', '\u2019']

  const sunnyDayTestCases = [
    {
      input: 'He said "hello" to her',
      expectedOutput: 'He said \u201chello\u201d to her'
    },
    {
      input: "He said 'hello' to her",
      expectedOutput: 'He said \u2018hello\u2019 to her'
    },
    {
      input: '"Hello',
      expectedOutput: '\u201cHello'
    },
    {
      input: 'He said ("hello")',
      expectedOutput: 'He said (\u201chello\u201d)'
    },
    {
      input: 'He said-"hello"',
      expectedOutput: 'He said-\u201chello\u201d'
    },
    {
      input: '"It\'s here," he said',
      expectedOutput: '\u201cIt\u2019s here,\u201d he said'
    },
    {
      input: 'He said"hello"to her',
      expectedOutput: 'He said\u201dhello\u201dto her'
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
              length: testCase.expectedOutput.length,
              text: [testCase.expectedOutput]
            }
          ],
          sections: [
            testCase.input.length,
            testCase.expectedOutput.length
          ]
        })
      }

      curlQuotes(primary, secondary)({ state, dispatch })

      strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
    })
  })

  it('given a partial selection, converts quotes only inside the selection', function () {
    const input = '"Hi" and "bye"'
    const expectedOutput = '\u201cHi\u201d and "bye"'

    let state = EditorState.create({
      doc: input,
      selection: EditorSelection.create([EditorSelection.range(0, 4)]),
    })

    const dispatch = (tx: Transaction) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given a contraction, converts apostrophe to closing single quote', function () {
    const input = "don't"
    const expectedOutput = 'don\u2019t'

    let state = EditorState.create({
      doc: input,
      selection: selectAll(input),
    })

    const dispatch = (tx: Transaction) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given a quote after newline, uses opening quote', function () {
    const input = 'He said:\n"hello"'
    const expectedOutput = 'He said:\n\u201chello\u201d'

    let state = EditorState.create({
      doc: input,
      selection: selectAll(input),
    })

    const dispatch = (tx: Transaction) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given mixed straight and curly quotes, converts only straight quotes', function () {
    const input = '\u201cHi\u201d and "bye"'
    const expectedOutput = '\u201cHi\u201d and \u201cbye\u201d'

    let state = EditorState.create({
      doc: input,
      selection: selectAll(input),
    })

    const dispatch = (tx: Transaction) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given no quotes and no selection then no transaction is dispatched', function () {
    const state = EditorState.create({
      doc: 'There are no quotes in this text'
    })

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })

  it('given quotes but no selection then no transaction is dispatched', function () {
    const state = EditorState.create({
      doc: 'He said "hello"'
    })

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })

  it('given only curly quotes, no transaction is dispatched', function () {
    const input = '\u201cHello\u201d and \u2018world\u2019'

    const state = EditorState.create({
      doc: input,
      selection: selectAll(input),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })
})
