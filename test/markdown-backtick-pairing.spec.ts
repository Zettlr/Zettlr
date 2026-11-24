/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for Markdown backtick pairing
 * CVM-Role:        TESTING
 * Maintainer:      Zettlr contributors
 * License:         GNU GPL v3
 *
 * Description:     Checks backtick pairing and fenced code input.
 *
 * END HEADER
 */

import { deepStrictEqual, strictEqual } from 'assert'
import { javascript } from '@codemirror/lang-javascript'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState, type Transaction } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { autoCloseBracketsCompartment, autoCloseBracketsExtension } from 'source/common/modules/markdown-editor/util/auto-close-brackets'
import { markdownBacktickPairing } from 'source/common/modules/markdown-editor/util/markdown-backtick-pairing'

function createState (doc = '', anchor = 0, head = anchor, autoClose = true): EditorState {
  return EditorState.create({
    doc,
    selection: { anchor, head },
    extensions: [
      markdown({ base: markdownLanguage, codeLanguages: info => info === 'js' ? javascript().language : null }),
      autoCloseBracketsCompartment.of(autoCloseBracketsExtension(autoClose)),
      markdownBacktickPairing
    ]
  })
}

function type (state: EditorState, input: string): EditorState {
  for (const char of input) {
    const selection = state.selection.main
    const view = {
      state,
      compositionStarted: false,
      dispatch: (transaction: Transaction) => { state = transaction.state }
    } as unknown as EditorView
    const handled = state.facet(EditorView.inputHandler).some(handler =>
      handler(view, selection.from, selection.to, char, () => state.update(state.replaceSelection(char)))
    )
    if (!handled) {
      state = state.update(state.replaceSelection(char)).state
    }
  }
  return state
}

describe('Markdown backtick pairing', function () {
  it('wraps selected text in backticks', function () {
    const state = type(createState('text', 0, 4), '`')
    strictEqual(state.doc.toString(), '`text`')
    strictEqual(state.selection.main.from, 1)
    strictEqual(state.selection.main.to, 5)
  })

  it('inserts a pair at an empty cursor', function () {
    const state = type(createState(), '`')
    strictEqual(state.doc.toString(), '``')
    strictEqual(state.selection.main.head, 1)
  })

  it('does not auto-close in front of an existing word', function () {
    const state = type(createState('text'), '`')
    strictEqual(state.doc.toString(), '`text')
  })

  it('allows the closing backtick of inline code to be typed', function () {
    const state = type(createState(), '`abc`')
    strictEqual(state.doc.toString(), '`abc`')
    strictEqual(state.selection.main.head, 5)
  })

  it('does not insert an extra backtick in a closing code fence', function () {
    const state = type(createState(), '```\nx\n```')
    strictEqual(state.doc.toString(), '```\nx\n```')
  })

  it('preserves a fenced block inside a block quote', function () {
    const state = type(createState(), '> ```\n> x\n> ```')
    strictEqual(state.doc.toString(), '> ```\n> x\n> ```')
  })

  it('preserves a closing fence in a JavaScript block', function () {
    const state = type(createState(), '```js\nconst x = 1\n```')
    strictEqual(state.doc.toString(), '```js\nconst x = 1\n```')
  })

  it('leaves embedded JavaScript language data unchanged', function () {
    const doc = '```js\nconst x = 1\n```'
    const parser = markdown({
      base: markdownLanguage,
      codeLanguages: info => info === 'js' ? javascript().language : null
    })
    const original = EditorState.create({ doc, extensions: [ parser ] })
    const modified = EditorState.create({ doc, extensions: [ parser, markdownBacktickPairing ] })
    deepStrictEqual(modified.languageDataAt('closeBrackets', 12), original.languageDataAt('closeBrackets', 12))
  })

  it('keeps the existing parenthesis behavior', function () {
    const state = type(createState('text', 0, 4), '(')
    strictEqual(state.doc.toString(), '(text)')
  })

  it('does not pair backticks when automatic closing is disabled', function () {
    const state = type(createState('', 0, 0, false), '`')
    strictEqual(state.doc.toString(), '`')
  })

  it('updates the current editor when automatic closing is toggled', function () {
    let state = createState()
    state = state.update({ effects: autoCloseBracketsCompartment.reconfigure(autoCloseBracketsExtension(false)) }).state
    state = type(state, '`')
    strictEqual(state.doc.toString(), '`')

    state = EditorState.create({
      extensions: [
        markdown({ base: markdownLanguage }),
        autoCloseBracketsCompartment.of(autoCloseBracketsExtension(false)),
        markdownBacktickPairing
      ]
    })
    state = state.update({ effects: autoCloseBracketsCompartment.reconfigure(autoCloseBracketsExtension(true)) }).state
    state = type(state, '`')
    strictEqual(state.doc.toString(), '``')
  })
})
