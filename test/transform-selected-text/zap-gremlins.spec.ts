/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the zapGremlins function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the zapGremlins function.
 *
 * END HEADER
 */

import { EditorState, Transaction } from '@codemirror/state'
import { deepEqual, fail, strictEqual } from 'assert'
import { zapGremlins } from '../../source/common/modules/markdown-editor/commands/transforms/zap-gremlins'
import { selectAll } from '../codemirror-test-utils/select-all'

describe('MarkdownEditor#zapGremlins()', function () {
  const individualCharacterTestCases = [
    '\u0000',
    '\u0001',
    '\u0002',
    '\u0003',
    '\u0004',
    '\u0005',
    '\u0006',
    '\u0007',
    '\u0008',
    // '\u0009', // keep space
    // '\u000A', // keep line return
    '\u000B',
    // '\u000C', // keep page break
    // '\u000D', // keep tab
    '\u000E',
    '\u000F',
    '\u0010',
    '\u0011',
    '\u0012',
    '\u0013',
    '\u0014',
    '\u0015',
    '\u0016',
    '\u0017',
    '\u0018',
    '\u0019',
    '\u001A',
    '\u001B',
    '\u001C',
    '\u001D',
    '\u001E',
    '\u001F',
    '\u00AD', // soft-hyphen
    '\u200A'  // hairline space
  ]

  individualCharacterTestCases.forEach((controlCharacter) => {
    it(`strips individual control character"`, function () {
      const state = EditorState.create({
        doc: controlCharacter,
        selection: selectAll(controlCharacter),
      })

      let wasDispatched = false

      const dispatch = (tx: Transaction) => {
        wasDispatched = true

        deepEqual(tx.changes, {
          inserted: [],
          sections: [
            controlCharacter.length,
            0
          ]
        })
      }

      zapGremlins({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })

  it('strips multiple control characters in sequence', function () {
    const text = '\u0000\u0000\u0000\u0017\u0001\u0017'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    let wasDispatched = false

    const dispatch = (tx: Transaction) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [],
        sections: [
          text.length,
          0
        ]
      })
    }

    zapGremlins({ state, dispatch })

    strictEqual(wasDispatched, true, "A transaction must have been dispatched")
  })

  it('strips only control characters leaving other text as-is', function () {
    const text = '\u0000\u0000LEAVE\u0000\u0017\u0001\u0017 ME'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    let wasDispatched = false

    const dispatch = (tx: Transaction) => {
      wasDispatched = true

      deepEqual(tx.changes, {
        inserted: [
          {
            length:8,
            text: [ 'LEAVE ME' ]
          }
        ],
        sections: [
          14,
          8
        ]
      })
    }

    zapGremlins({ state, dispatch })

    strictEqual(wasDispatched, true, "A transaction must have been dispatched")
  })

  it('text with just spaces, tabs, page breaks and line breaks is left as-is', function () {
    const text = `\u0009
\u000A

\u000C  \u000D  \u000D`

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    zapGremlins({ state, dispatch })
  })
})
