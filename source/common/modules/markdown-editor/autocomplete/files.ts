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

import { type Completion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { type AutocompletePlugin } from '.'
import { configField } from '../util/configuration'

/**
 * Use this effect to provide the editor state with a set of new citekeys
 */
export const filesUpdate = StateEffect.define<Array<{ filename: string, displayName: string, id: string }>>()
export const filesUpdateField = StateField.define<Completion[]>({
  create (_state) {
    return []
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(filesUpdate)) {
        // Convert the files into completion objects
        return effect.value.map(entry => {
          return {
            label: entry.displayName,
            detail: entry.id !== '' ? entry.id : undefined,
            apply: apply(entry.filename, entry.id, entry.displayName)
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
const apply = (filename: string, fileId: string, displayName: string) => function (view: EditorView, completion: Completion, from: number, to: number) {
  // Applies a filename insertion
  const { zknLinkFormat, linkWithIDIfPossible, zknAddFileTitle } = view.state.field(configField)

  const linkEndAfterCursor = view.state.sliceDoc(to, to + 2) === ']]'

  const linkTarget = linkWithIDIfPossible && fileId !== '' ? fileId : filename
  const linkLabel = zknAddFileTitle ? displayName : ''

  let insert = `${linkTarget}`
  if (linkLabel !== '') {
    if (zknLinkFormat === 'link|title') {
      insert = `${linkTarget}|${linkLabel}`
    } else {
      insert = `${linkLabel}|${linkTarget}`
    }
  }

  if (!linkEndAfterCursor) {
    insert += ']]'
  }

  // By default, place the cursor after the inserted part
  let anchor = from + insert.length + (linkEndAfterCursor ? 2 : 0)
  let head = anchor

  // However, if the link label was present, preselect it so that the user can
  // overwrite it.
  if (linkLabel !== '' && zknLinkFormat === 'link|title') {
    anchor = from + linkTarget.length + 1
    head = anchor + linkLabel.length
  } else if (linkLabel !== '' && zknLinkFormat === 'title|link') {
    anchor = from
    head = anchor + linkLabel.length
  }

  view.dispatch({
    changes: [{ from, to, insert }],
    selection: { anchor, head }
  })
}

export const files: AutocompletePlugin = {
  applies (ctx) {
    // File autocompletion triggers as soon as we detect the start of a link
    const { text, from } = ctx.state.doc.lineAt(ctx.pos)
    const lineTextUntilPos = text.slice(0, ctx.pos - from)
    const linkStartBefore = lineTextUntilPos.lastIndexOf('[[') > lineTextUntilPos.lastIndexOf(']]')
    const linkStartRange = ctx.state.sliceDoc(ctx.pos - 2, ctx.pos)

    if (linkStartRange === '[[') {
      return ctx.pos
    } else if (linkStartBefore) {
      return from + lineTextUntilPos.lastIndexOf('[[') + 2
    } else {
      return false
    }
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = ctx.state.field(filesUpdateField)
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query) || (entry.info as string|undefined)?.toLowerCase().includes(query) === true
    })
  },
  fields: [filesUpdateField]
}
