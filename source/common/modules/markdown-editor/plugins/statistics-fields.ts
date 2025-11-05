/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Statistics Field
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines a set of StateFields that are used to keep
 *                  a few statistics such as word counts available to the
 *                  overlying MarkdownEditor instance.
 *
 * END HEADER
 */

import { ensureSyntaxTree } from '@codemirror/language'
import { StateEffect, StateField, type EditorState } from '@codemirror/state'
import { ViewPlugin, type EditorView, type ViewUpdate } from '@codemirror/view'
import { markdownToAST } from '@common/modules/markdown-utils'
import { countAll } from '@common/util/counter'

function count (state: EditorState): { chars: number, words: number } {
  const tree = ensureSyntaxTree(state, state.doc.length) ?? undefined

  const ast = markdownToAST(state.sliceDoc(), tree)
  const locale: string = window.config.get('appLang')
  return countAll(ast, locale)
}

export const updateWordCountEffect = StateEffect.define<{ chars: number, words: number }>()

export const countField = StateField.define<{ chars: number, words: number }>({
  create (state: EditorState) {
    return count(state)
  },

  update (value, transaction) {
    for (const e of transaction.effects) {
      if (e.is(updateWordCountEffect)) {
        return e.value
      }
    }

    return value
  },

  compare (a, b): boolean {
    return a.chars === b.chars && a.words === b.words
  }
})

export const countPlugin = ViewPlugin.fromClass(class {
  private timeout: number | null = null
  private delay = 750

  update (update: ViewUpdate) {
    if (!update.docChanged) { return }

    this.updateCounts(update.view)
  }

  updateCounts (view: EditorView) {
    if (this.timeout != null) {
      window.clearTimeout(this.timeout)
    }

    this.timeout = window.setTimeout(() => {
      this.timeout = null

      const counts = count(view.state)

      view.dispatch({ effects: updateWordCountEffect.of(counts) })
    }, this.delay)
  }

  destroy () {
    if (this.timeout != null) {
      window.clearTimeout(this.timeout)
      this.timeout = null
    }
  }
})
