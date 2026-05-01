/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for quote autocorrect commands
 * CVM-Role:        TESTING
 * Maintainers:     Zilu Wang
 * License:         GNU GPL v3
 *
 * Description:     This file tests the autocorrect commands that turn straight
 *                  quotes into curly quotes and back again.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import { EditorSelection, EditorState, type TransactionSpec } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { handleBackspace, handleQuote } from 'source/common/modules/markdown-editor/commands/autocorrect'
import { configField, configUpdateEffect } from 'source/common/modules/markdown-editor/util/configuration'

describe('MarkdownEditor#autocorrect quotes()', function () {
  function createView (doc: string, selection: EditorSelection) {
    let state = EditorState.create({
      doc,
      selection,
      extensions: [configField]
    })

    state = state.update({
      effects: configUpdateEffect.of({
        autocorrect: {
          active: true,
          matchWholeWords: false,
          magicQuotes: {
            primary: '“…”',
            secondary: '‘…’'
          },
          replacements: []
        }
      })
    }).state

    const view = {
      get state () {
        return state
      },
      dispatch (transaction: TransactionSpec) {
        state = state.update(transaction).state
      }
    } as unknown as EditorView

    return { get state () { return state }, view }
  }

  it('given selected text and a straight double quote, inserts curly double quotes', function () {
    const editor = createView('Hello', EditorSelection.create([EditorSelection.range(0, 5)]))

    strictEqual(handleQuote('"')(editor.view), true)
    strictEqual(editor.state.doc.toString(), '“Hello”')
  })

  it('given selected text and a straight single quote, inserts curly single quotes', function () {
    const editor = createView('Hello', EditorSelection.create([EditorSelection.range(0, 5)]))

    strictEqual(handleQuote('\'')(editor.view), true)
    strictEqual(editor.state.doc.toString(), '‘Hello’')
  })

  it('given a curly double quote before the cursor, backspace turns it back into a straight double quote', function () {
    const editor = createView('“', EditorSelection.create([EditorSelection.cursor(1)]))

    strictEqual(handleBackspace(editor.view), true)
    strictEqual(editor.state.doc.toString(), '"')
  })

  it('given a curly single quote before the cursor, backspace turns it back into a straight single quote', function () {
    const editor = createView('‘', EditorSelection.create([EditorSelection.cursor(1)]))

    strictEqual(handleBackspace(editor.view), true)
    strictEqual(editor.state.doc.toString(), '\'')
  })
})
