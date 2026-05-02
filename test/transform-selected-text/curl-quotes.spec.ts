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

import { EditorState } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { curlQuotes } from 'source/common/modules/markdown-editor/commands/transforms/curl-quotes'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#curlQuotes()', function () {
  // Using en-US magic quotes: "\u201c\u201d" and "\u2018\u2019"
  const primary: [string, string] = ['\u201c', '\u201d']
  const secondary: [string, string] = ['\u2018', '\u2019']

  const createState = (
    doc: string,
    selection?: 'all' | { anchor: number, head: number }
  ): EditorState => {
    if (selection === 'all') {
      return EditorState.create({
        doc,
        selection: selectAll(doc),
      })
    }

    if (selection != null) {
      return EditorState.create({
        doc,
        selection,
      })
    }

    return EditorState.create({ doc })
  }

  // Test cases cover:
  // 1. Double quote conversion (opening and closing)
  // 2. Single quote conversion (opening and closing)
  // 3. Quotes at text start (should use opening quote)
  // 4. Quotes after special start characters like (, -, etc.
  // 5. Mixed single and double quotes
  // 6. Edge case: no quotes in text (no dispatch should occur)
  // 7. Edge case: quotes without proper spacing (closing quote behavior)

  it('given straight double quotes, converts to curly double quotes', function () {
    const input = 'He said "hello" to her'
    const expectedOutput = 'He said \u201chello\u201d to her'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given a partial selection, converts quotes only inside the selection', function () {
    const input = '"Hi" and "bye"'
    const expectedOutput = '\u201cHi\u201d and "bye"'

    let state = createState(input, { anchor: 0, head: 4 })

    const dispatch = (tx: any) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given no quotes and no selection then no transaction is dispatched', function () {
    const state = createState('There are no quotes in this text')

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })

  it('given quotes but no selection then no transaction is dispatched', function () {
    const state = createState('He said "hello"')

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })

  it('given straight single quotes, converts to curly single quotes', function () {
    const input = "He said 'hello' to her"
    const expectedOutput = 'He said \u2018hello\u2019 to her'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given quotes at the beginning, opening quote should be used', function () {
    const input = '"Hello'
    const expectedOutput = '\u201cHello'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given quotes after opening parenthesis, should use opening quote', function () {
    const input = 'He said ("hello")'
    const expectedOutput = 'He said (\u201chello\u201d)'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given quotes after dash, should use opening quote', function () {
    const input = 'He said-"hello"'
    const expectedOutput = 'He said-\u201chello\u201d'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given mixed straight and curly quotes, converts only straight quotes', function () {
    const input = '\u201cHi\u201d and "bye"'
    const expectedOutput = '\u201cHi\u201d and \u201cbye\u201d'

    let state = createState(input, 'all')

    const dispatch = (tx: any) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given mixed single and double quotes, converts both correctly', function () {
    const input = '"It\'s here," he said'
    const expectedOutput = '\u201cIt\u2019s here,\u201d he said'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })

  it('given a contraction, converts apostrophe to closing single quote', function () {
    const input = "don't"
    const expectedOutput = 'don\u2019t'

    let state = createState(input, 'all')

    const dispatch = (tx: any) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given a quote after newline, uses opening quote', function () {
    const input = 'He said:\n"hello"'
    const expectedOutput = 'He said:\n\u201chello\u201d'

    let state = createState(input, 'all')

    const dispatch = (tx: any) => {
      state = state.update(tx).state
    }

    const handled = curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(handled, true)
    strictEqual(state.doc.toString(), expectedOutput)
  })

  it('given only curly quotes, no transaction is dispatched', function () {
    const input = '\u201cHello\u201d and \u2018world\u2019'

    const state = createState(input, 'all')

    const dispatch = () => fail('No transaction must be dispatched')

    curlQuotes(primary, secondary)({ state, dispatch })
  })

  it('given quotes separated by letters, uses closing quote after letter', function () {
    const input = 'He said"hello"to her'
    const expectedOutput = 'He said\u201dhello\u201dto her'

    const state = createState(input, 'all')

    let wasDispatched = false

    const dispatch = (tx: any) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedOutput.length,
            text: [expectedOutput]
          }
        ],
        sections: [
          input.length,
          expectedOutput.length
        ]
      })
    }

    curlQuotes(primary, secondary)({ state, dispatch })

    strictEqual(wasDispatched, true, 'A transaction must have been dispatched')
  })
})
