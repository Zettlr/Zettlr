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

export type CitationMode = 'zotero' | 'original'

export const citationMode = StateEffect.define<CitationMode>()
export const citationModeField = StateField.define<CitationMode>({
  create: () => 'zotero',
  update (val, tr) {
    for (const e of tr.effects) {
      if (e.is(citationMode)) return e.value
    }
    return val
  }
})

export const citekeyUpdate = StateEffect.define<Array<{ citekey: string, displayText: string }>>()
export const citekeyUpdateField = StateField.define<Completion[]>({
  create: () => [],
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(citekeyUpdate)) {
        return effect.value.map(entry => ({
          label: entry.citekey,
          info: entry.displayText,
          apply
        }))
      }
    }
    return val
  }
})

function sortCitationKeysByUsage (state: EditorState): Completion[] {
  const entries = state.field(citekeyUpdateField)
  const existingCitations = extractCitations(state.doc.toString())
    .flatMap(c => c.citations.map(cite => cite.id))

  const citationCounts: Record<string, number> = {}
  for (const key of existingCitations) {
    citationCounts[key] = (citationCounts[key] || 0) + 1
  }

  entries.sort((a, b) => (citationCounts[b.label] || 0) - (citationCounts[a.label] || 0))
  return entries
}

const apply = function (view: EditorView, completion: Completion, from: number, to: number): void {
  const citeStyle = view.state.field(configField).citeStyle
  const lineObject = view.state.doc.lineAt(from)
  const line = lineObject.text
  const fromCh = from - lineObject.from
  const toCh = to - lineObject.from

  const afterOpen = line.lastIndexOf('[', fromCh) > line.lastIndexOf(']', fromCh)
  const beforeClose = (!line.includes('[', toCh) && line.includes(']', toCh)) ||
                      (line.indexOf(']', toCh) < line.indexOf('[', toCh))
  const noBrackets = !afterOpen && !beforeClose

  let insert: string
  if (citeStyle === 'regular' && noBrackets) {
    insert = `[@${completion.label}]`
    view.dispatch({
      changes: [{ from: from - 1, to, insert }],
      selection: { anchor: from - 1 + insert.length - 1 }
    })
  } else if (citeStyle === 'in-text-suffix' && noBrackets) {
    insert = `${completion.label} []`
    view.dispatch({
      changes: [{ from, to, insert }],
      selection: { anchor: from + insert.length - 1 }
    })
  } else {
    insert = String(completion.label)
    view.dispatch({
      changes: [{ from, to, insert }],
      selection: { anchor: from + insert.length }
    })
  }
}

export const citations: AutocompletePlugin = {
  applies (ctx) {
    const { pos, state } = ctx
    return pos > 0 && state.sliceDoc(pos - 1, pos) === '@' ? pos : false
  },

  async entries (ctx: CompletionContext, rawQuery: string) {
    const q = rawQuery.replace(/^@/, '').trim()
    const mode = ctx.state.field(citationModeField)

    if (mode === 'zotero') {
      try {
        const items = await window.ipc.invoke('zotero:search', q)
        const completions = items.map(i => ({
          label: i.citekey,
          info: `${i.title} — ${i.author} (${i.year})`,
          apply
        }))

        return completions
      } catch {
        return []
      }
    } else {
      //const entries = ctx.state.field(citekeyUpdateField)
      const all = sortCitationKeysByUsage(ctx.state)
      return all.filter(c =>
        c.label.toLowerCase().includes(q.toLowerCase()) ||
        (c.info as string).toLowerCase().includes(q.toLowerCase())
      )
    }
  },

  fields: [ citekeyUpdateField, citationModeField ]
}
export function createCitationModePicker (view: EditorView): void {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.bottom = '40px'
  container.style.right = '50px'
  container.style.zIndex = '9999'
  container.style.background = '#f0f0f0'
  container.style.border = '1px solid #ccc'
  container.style.borderRadius = '6px'
  container.style.padding = '6px'
  container.style.fontFamily = 'sans-serif'

  const label = document.createElement('label')
  label.textContent = 'Citation Mode: '
  label.style.marginRight = '4px'

  const select = document.createElement('select')
  const modes: CitationMode[] = [ 'zotero', 'original' ]
  for (const mode of modes) {
    const option = document.createElement('option')
    option.value = mode
    option.textContent = mode[0].toUpperCase() + mode.slice(1)
    select.appendChild(option)
  }

  select.onchange = () => {
    const mode = select.value as CitationMode
    view.dispatch({ effects: citationMode.of(mode) })
    console.info(`[Citation] Mode changed to: ${mode}`)
  }

  container.appendChild(label)
  container.appendChild(select)
  document.body.appendChild(container)
}

