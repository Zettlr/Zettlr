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

import { stripDuplicateSpaces } from '@common/modules/markdown-editor/util/transform-selected-text'
import { fail, deepEqual, strictEqual } from 'assert'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { selectAll } from './support'

describe('MarkdownEditor#stripDuplicateSpaces()', function () {
  it('given text with two duplicate spaces' +
     ' and all the text is selected' +
     ' when stripDuplicateSpaces is applied' +
     ' then a transaction is dispatched to strip them', function () {

    const text = 'Duplicate (  ) spaces'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    let wasDispatched = false

    const dispatch = (tx: Transaction) => {
      wasDispatched = true

       // minus the 1 stripped space
      const expectedLengthAfterStripping = text.length - 1

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedLengthAfterStripping,
            text: ['Duplicate ( ) spaces']
          }
        ],
        sections: [
          text.length,
          expectedLengthAfterStripping
        ]
      })
    }

    stripDuplicateSpaces({ state, dispatch })

    strictEqual(wasDispatched, true, "A transaction must have been dispatched")
  })

  it('given text with multiple occurrences of duplicate spaces' +
     ' and all the text is selected' +
     ' when stripDuplicateSpaces is applied' +
     ' then a transaction is dispatched to strip all occurrences', function () {

    const text = 'Duplicate (  ) spaces and again (     ) and again (  ) '

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    let wasDispatched = false

    const dispatch = (tx: Transaction) => {
     wasDispatched = true

     // minus all the stripped extra spaces
      const expectedLengthAfterStripping = text.length - 6

      deepEqual(tx.changes, {
        inserted: [
          {
            length: expectedLengthAfterStripping,
            text: ['Duplicate ( ) spaces and again ( ) and again ( ) ']
          }
        ],
        sections: [
          text.length,
          expectedLengthAfterStripping
        ]
      })
   }

   stripDuplicateSpaces({ state, dispatch })

   strictEqual(wasDispatched, true, "A transaction must have been dispatched")
 })

  it('given text with no duplicate spaces' +
     ' and no selected text' +
     ' when stripDuplicateSpaces is applied' +
     ' then no transaction is dispatched' +
     ' because nothing is selected', function () {

      const state = EditorState.create({
        doc: 'There are no duplicate spaces in this text'
      })

    const dispatch = () => fail('No transaction must be dispatched')

    stripDuplicateSpaces({ state, dispatch })
  })

  it('given text with no duplicate spaces' +
     ' and all the text is selected' +
     ' when stripDuplicateSpaces is applied' +
     ' then no transaction is dispatched' +
     ' because there are no spaces to be stripped', function () {

    const text = 'There are no duplicate spaces in this text'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    stripDuplicateSpaces({ state, dispatch })
  })

  it('given text with two duplicate spaces' +
     ' but those dupes are not in the selected text' +
     ' when stripDuplicateSpaces is applied' +
     ' then no transaction is dispatched', function () {

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

  it('given text with no duplicate spaces' +
     ' but there\'s a sequence of duplicated *tabs*' +
     ' and all the text is selected' +
     ' when stripDuplicateSpaces is applied' +
     ' then no transaction is dispatched' +
     ' because there are no duplicate spaces to be stripped', function () {

    const text = 'No duplicate spaces but \t \t\t there are duplicate tabs'

    const state = EditorState.create({
      doc: text,
      selection: selectAll(text),
    })

    const dispatch = () => fail('No transaction must be dispatched')

    stripDuplicateSpaces({ state, dispatch })
  })
})
