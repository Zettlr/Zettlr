import { Completion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { AutocompletePlugin } from '.'

/**
 * Use this effect to provide the editor state with a set of new tags to autocomplete
 */
export const tagsUpdate = StateEffect.define<string[]>()
export const tagsUpdateField = StateField.define<Completion[]>({
  create (state) {
    return []
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(tagsUpdate)) {
        // Convert the citationentries into completion objects
        return effect.value.map(entry => {
          return {
            label: entry,
            apply
          }
        })
      }
    }
    return val
  }
})

/**
 * This utility function inserts a tag
 */
const apply = function (view: EditorView, completion: Completion, from: number, to: number) {
  view.dispatch({
    changes: [{ from, to, insert: completion.label }],
    selection: { anchor: to }
  })
}

export const tags: AutocompletePlugin = {
  applies (ctx) {
    // A valid citekey position is: Beginning of the line (citekey without square
    // brackets), after a square bracket open (regular citation without prefix),
    // or after a space (either a standalone citation or within square brackets
    // but with a prefix). Also, the citekey can be prefixed with a -.
    if (ctx.state.doc.sliceString(ctx.pos - 1, ctx.pos) !== '#') {
      return false // Only applies after the user typed an #
    }

    const lineObject = ctx.state.doc.lineAt(ctx.pos)

    if (ctx.pos - lineObject.from === 1) {
      return true // Start of Line with an '#' -> Definitely a tag
    }

    const charBefore = ctx.state.doc.sliceString(ctx.pos - 2, ctx.pos - 1)
    if (charBefore === ' ') {
      return true // Valid char in front of the #
    }

    return false
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = ctx.state.field(tagsUpdateField)
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query)
    })
  },
  fields: [tagsUpdateField]
}
