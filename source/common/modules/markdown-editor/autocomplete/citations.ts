/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Citation Autocomplete
 * CVM-Role:        Autocomplete Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin manages citations.
 *
 * END HEADER
 */

import { type Completion, type CompletionContext } from '@codemirror/autocomplete'
import { type EditorState, StateEffect, StateField } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import extractCitations from '@common/util/extract-citations'
import { type AutocompletePlugin } from '.'
import { configField } from '../util/configuration'

/**
 * Use this effect to provide the editor state with a set of new citekeys
 */
export const citekeyUpdate = StateEffect.define<Array<{ citekey: string, displayText: string }>>()
export const citekeyUpdateField = StateField.define<Completion[]>({
  create (_state) {
    return []
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(citekeyUpdate)) {
        // Convert the citationentries into completion objects
        return effect.value.map(entry => {
          return {
            label: entry.citekey,
            info: entry.displayText,
            apply
          }
        })
      }
    }
    return val
  }
})

/**
 * This function takes the citations from the corresponding database and returns
 * them in a sorted fashion based on which citations occur in the document, by
 * count.
 *
 * @param   {EditorState}  state  The editor state
 *
 * @return  {Completion[]}        The sorted completions
 */
function sortCitationKeysByUsage (state: EditorState): Completion[] {
  // First, get our existing entries in the database, and re-transform them into
  // what the update effect expects
  const entries = state.field(citekeyUpdateField)

  // Then, retrieve the already existing citations
  const existingCitations = extractCitations(state.doc.toString())
    .map(c => {
      return c.citations.map(cite => cite.id)
    })
    .flat()

  // Create a counter
  const citationCounts: Record<string, number> = {}
  for (const key of existingCitations) {
    if (!(key in citationCounts)) {
      citationCounts[key] = 0
    }

    citationCounts[key] += 1
  }

  // Now sort the entries based on the existing citation counts
  entries.sort((a, b) => {
    const countA: number = citationCounts[a.label] ?? 0
    const countB: number = citationCounts[b.label] ?? 0
    return countB - countA
  })

  return entries
}

/**
 * This utility function just takes a citekey and ensures that the way the
 * completion is applied matches the settings on the editor instance.
 *
 * @param   {string}      infoString  The infostring to use
 */
const apply = function (view: EditorView, completion: Completion, from: number, to: number): void {
  const citeStyle = view.state.field(configField).citeStyle
  const lineObject = view.state.doc.lineAt(from)
  const line = lineObject.text
  const fromCh = from - lineObject.from
  const toCh = to - lineObject.from

  const afterOpen = line.lastIndexOf('[', fromCh) > line.lastIndexOf(']', fromCh)
  // Either no open and 1 close bracket or a close bracket after an open bracket
  const beforeClose = (!line.includes('[', toCh) && line.includes(']', toCh)) || (line.indexOf(']', toCh) < line.indexOf('[', toCh))
  const noBrackets = !afterOpen && !beforeClose

  if (citeStyle === 'regular' && noBrackets) {
    const insert = `[@${completion.label}]`
    view.dispatch({
      // Minus 1 is important since we have to overwrite the @-sign with [@
      changes: [{ from: from - 1, to, insert }],
      selection: { anchor: from - 1 + insert.length - 1 } // Between citekey and ]
    })
  } else if (citeStyle === 'in-text-suffix' && noBrackets) {
    // We should add square brackets after the completion text
    const insert = `${completion.label} []`
    view.dispatch({
      changes: [{ from, to, insert }],
      selection: { anchor: from + insert.length - 1 } // Inside []
    })
  } else {
    // Otherwise: citeStyle was in-text or there were brackets surrounding the
    // citekey, so we can simply replace it
    const insert = String(completion.label)
    view.dispatch({ changes: [{ from, to, insert }], selection: { anchor: from + insert.length } })
  }
}

/** — the combined plugin — */
export const citations: AutocompletePlugin = {
  applies (ctx) {
    const { pos, state } = ctx
    return pos > 0 && state.sliceDoc(pos - 1, pos) === '@' ? pos : false
  },

  async entries (ctx: CompletionContext, rawQuery: string) {
    const q = rawQuery.replace(/^@/, '').trim()

    // —— hard-coded to Zotero right now ——
    if (1 === 1) {
      try {
        const items: Array<{ citekey: string; title: string; author: string; year: string }> =
          await window.ipc.invoke('zotero:search', q)

        return items.map(i => ({
          label: i.citekey,
          info:  `${i.title} — ${i.author} (${i.year})`,
          apply
        }))
      } catch {
        return []
      }
    } else {
      // —— your old built-in branch ——
      const all = sortCitationKeysByUsage(ctx.state)
      return all.filter(c =>
        c.label.toLowerCase().includes(q.toLowerCase()) ||
        (c.info as string).toLowerCase().includes(q.toLowerCase())
      )
    }
  },
  fields: [citekeyUpdateField]
}
