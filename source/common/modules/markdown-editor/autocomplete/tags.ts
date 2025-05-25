/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tags Autocomplete
 * CVM-Role:        Autocomplete Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin manages tags.
 *
 * END HEADER
 */

import { type Completion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { type TagRecord } from '@providers/tags'
import { type AutocompletePlugin } from '.'

/**
 * Use this effect to provide the editor state with a set of new tags to autocomplete
 */
export const tagsUpdate = StateEffect.define<TagRecord[]>()
export const tagsUpdateField = StateField.define<Completion[]>({
  create (_state) {
    return []
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(tagsUpdate)) {
        // Convert the entries into completion objects
        return effect.value
          // Remove tags with spaces, as they cannot be applied within documents
          .filter(entry => !entry.name.includes(' '))
          .map(entry => {
            return {
              label: entry.name,
              info: entry.desc,
              type: entry.color !== undefined ? 'keyword' : undefined,
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
const apply = function (view: EditorView, completion: Completion, from: number, to: number): void {
  view.dispatch({
    changes: [{ from, to, insert: completion.label }],
    selection: { anchor: from + completion.label.length }
  })
}

export const tags: AutocompletePlugin = {
  applies (ctx) {
    if (ctx.pos === 0) {
      return false
    }

    const match = ctx.matchBefore(/(?<=^|\s|[({[])#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?)?/)
    if (match === null || match.to < ctx.pos) {
      return false
    } else if (match.to === ctx.pos) {
      return match.from + 1
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
