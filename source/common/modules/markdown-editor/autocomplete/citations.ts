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
 * Strips inline HTML that citeproc/biblatex emits in citation display text so
 * that it can be shown verbatim in the autocomplete info pane.
 *
 * BibTeX's double-curly-brace case-preserving syntax (e.g. `{{Opening Up}}`)
 * is serialised by citeproc as `<span class="nocase">…</span>`, and other
 * markup such as `<i>`/`<b>` can appear in titles too. CodeMirror renders a
 * string `info` as escaped plain text, so without stripping, the raw tags show
 * up literally in the citation picker preview (see issue #6409). We only ever
 * display the text content, so dropping the tags is both safe and correct.
 *
 * @param   {string}  displayText  The raw display text, possibly containing HTML.
 *
 * @return  {string}               The display text with any HTML tags removed.
 */
function stripCitationHtml (displayText: string): string {
  // Remove anything that looks like an HTML tag, then collapse the whitespace
  // that collapsing span boundaries can leave behind.
  return displayText
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

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
        // Convert the citationentries into completion objects. The displayText
        // may contain citeproc HTML (e.g. <span class="nocase">…</span> from
        // case-preserving braces) which CodeMirror would render as escaped
        // plain text in the info pane, so strip it before exposing the info.
        return effect.value.map(entry => {
          return {
            label: entry.citekey,
            info: stripCitationHtml(entry.displayText),
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

export const citations: AutocompletePlugin = {
  applies (ctx) {
    // A valid citekey position is: Beginning of the line (citekey without square
    // brackets), after a square bracket open (regular citation without prefix),
    // or after a space (either a standalone citation or within square brackets
    // but with a prefix). Also, the citekey can be prefixed with a -.
    const { text, from } = ctx.state.doc.lineAt(ctx.pos)
    const textBefore = text.slice(0, ctx.pos - from)
    if (text.startsWith('@') && ctx.pos - from === 1) {
      // The line starts with an @ and the cursor is directly behind it
      return ctx.pos
    } else if (/(?<=[-[\s(])@[^\[\]]*$/.test(textBefore)) {
      // The text immediately before the cursor matches a valid citation
      return from + textBefore.lastIndexOf('@') + 1
    } else {
      // Nopey
      return false
    }
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = sortCitationKeysByUsage(ctx.state)
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query) || (entry.info as string|undefined)?.toLowerCase().includes(query) === true
    })
  },
  fields: [citekeyUpdateField]
}
