import { Completion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { AutocompletePlugin } from '.'
import { configField } from '../util/configuration'

/**
 * Use this effect to provide the editor state with a set of new citekeys
 */
export const filesUpdate = StateEffect.define<Array<{ filename: string, id: string }>>()
export const filesUpdateField = StateField.define<Completion[]>({
  create (state) {
    return []
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(filesUpdate)) {
        // Convert the files into completion objects
        return effect.value.map(entry => {
          return {
            label: entry.filename,
            info: entry.id,
            apply: apply(entry.filename, entry.id)
          }
        })
      }
    }
    return val
  }
})

/**
 * This utility function just takes a citekey and ensures that the way the
 * completion is applied matches the settings on the editor instance.
 *
 * @param   {string}      infoString  The infostring to use
 */
const apply = (filename: string, fileId: string) => function (view: EditorView, completion: Completion, from: number, to: number) {
  // Applies a filename insertion
  const { linkFilenameOnly, linkPreference, linkEnd } = view.state.field(configField)

  if (linkFilenameOnly) {
    // Just dump the filename in there
    view.dispatch({
      changes: [{ from, to, insert: `${filename}${linkEnd}` }],
      selection: { anchor: to }
    })
  } else {
    const textToInsert = fileId === '' ? filename: fileId
    if (linkPreference === 'always' || (linkPreference === 'withID' && textToInsert === fileId)) {
      view.dispatch({
        changes: [{ from, to, insert: `${textToInsert}${linkEnd} ${filename}` }],
        selection: { anchor: to }
      })
    } else {
      view.dispatch({
        changes: [{ from, to, insert: `${textToInsert}${linkEnd}` }],
        selection: { anchor: to }
      })
    }
  }
}

export const files: AutocompletePlugin = {
  applies (ctx) {
    // File autocompletion triggers as soon as we detect the start of a link
    const { linkStart } = ctx.state.field(configField)
    const linkStartRange = ctx.state.sliceDoc(ctx.pos - linkStart.length, ctx.pos)
    return linkStartRange === linkStart
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = ctx.state.field(filesUpdateField)
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query) || (entry.info as string|undefined)?.toLowerCase().includes(query)
    })
  },
  fields: [filesUpdateField]
}
