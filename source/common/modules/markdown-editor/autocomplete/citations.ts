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

import { type Completion } from '@codemirror/autocomplete'
import { type EditorState, StateEffect, StateField } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { type AutocompletePlugin } from '.'
import { configField } from '../util/configuration'
import { extractCitationNodes, nodeToCiteItem } from '../parser/citation-parser'

/**
 * Describes a Citation Autocomplete record.
 */
export interface CitationRecord {
  citekey: string
  displayText: string
}

/**
 * Use this effect to provide the editor state with a set of new citekeys
 */
export const citekeyUpdate = StateEffect.define<CitationRecord[]>()
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
function getCitationEntries (state: EditorState): Completion[] {
  // First, get our existing entries in the database, and re-transform them into
  // what the update effect expects
  const entries = state.field(citekeyUpdateField)

  const doc = state.sliceDoc()
  const citationNodes = extractCitationNodes(state).map(node => nodeToCiteItem(node, doc))

  // Then, retrieve the already existing citations
  const existingCitations = citationNodes.flatMap(c => c.items.map(item => item.id))

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

  // The possible previous characters are `{[}{-}@`.
  // Possible tailing characters are `]`
  // Trim whitespace to make the `startsWith` test simpler.
  const charBefore = view.state.sliceDoc(from - 3, from).trim()
  const charAfter = view.state.sliceDoc(to, to + 1).trim()
  const noBrackets = !charBefore.startsWith('[') && !charAfter.startsWith(']')

  if (citeStyle === 'regular' && noBrackets) {
    const prefix = charBefore.slice(-2, -1) === '-' ? '-@' : '@'
    const insert = `[${prefix}${completion.label}]`
    view.dispatch({
      // Overwrite any previous citekey
      changes: [{ from: from - prefix.length, to, insert }],
      selection: { anchor: from + insert.length - 1 } // Between citekey and ]
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

export const citations: AutocompletePlugin = {
  filter: false,
  fields: [citekeyUpdateField],
  applies (ctx) {
    const token = ctx.tokenBefore([ 'CitationCitekey', 'CitationAtSign' ])

    if (token?.type.is('CitationCitekey') === true) {
      return token.from
    }

    if (token?.type.is('CitationAtSign') === true) {
      return ctx.pos
    }

    if (ctx.matchBefore(/(?:^|\s)-?@/)) {
      return ctx.pos
    }

    return false
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = getCitationEntries(ctx.state)
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query) || (entry.info as string|undefined)?.toLowerCase().includes(query) === true
    })
  },
}
