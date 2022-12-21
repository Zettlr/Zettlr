/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Files Autocomplete
 * CVM-Role:        Autocomplete Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin manages Zettelkasten links.
 *
 * END HEADER
 */

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
            label: (entry.id != null && entry.id !== '')
              ? `${entry.id}: ${entry.filename}`
              : entry.filename,
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

  const linkEndAfterCursor = view.state.sliceDoc(to, to + linkEnd.length) === linkEnd
  const postLink = (linkEndAfterCursor) ? '' : linkEnd

  let insert = ''
  if (linkFilenameOnly) {
    // Just dump the filename in there
    insert = `${filename}${postLink}`
  } else {
    const textToInsert = fileId === '' ? filename: fileId
    if (linkPreference === 'always' || (linkPreference === 'withID' && textToInsert === fileId)) {
      insert = `${textToInsert}${linkEnd} ${filename}` // NOTE: No postLink, but linkEnd
      if (linkEndAfterCursor) {
        to += linkEnd.length // Overwrite the linkEnd following the completion
      }
    } else {
      insert = `${textToInsert}${postLink}`
    }
  }

  view.dispatch({
    changes: [{ from, to, insert }],
    selection: { anchor: from + insert.length }
  })
}

export const files: AutocompletePlugin = {
  applies (ctx) {
    // File autocompletion triggers as soon as we detect the start of a link
    const { linkStart, linkEnd } = ctx.state.field(configField)
    const { text, from } = ctx.state.doc.lineAt(ctx.pos)
    const lineTextUntilPos = text.slice(0, ctx.pos - from)
    const linkStartBefore = lineTextUntilPos.indexOf(linkStart) > lineTextUntilPos.indexOf(linkEnd)
    const linkStartRange = ctx.state.sliceDoc(ctx.pos - linkStart.length, ctx.pos)

    if (linkStartRange === linkStart) {
      return ctx.pos
    } else if (linkStartBefore) {
      return from + text.indexOf(linkStart) + linkStart.length
    } else {
      return false
    }
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
