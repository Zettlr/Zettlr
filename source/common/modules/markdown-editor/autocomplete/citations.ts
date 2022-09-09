import { Completion } from '@codemirror/autocomplete'
import { StateEffect, StateField } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { AutocompletePlugin } from '.'
import { configField } from '../util/configuration'

/**
 * Use this effect to provide the editor state with a set of new citekeys
 */
export const citekeyUpdate = StateEffect.define<Array<{ citekey: string, displayText: string }>>()
export const citekeyUpdateField = StateField.define<Completion[]>({
  create (state) {
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
    view.dispatch({
      // Minus 1 is important since we have to overwrite the @-sign with [@
      changes: [{ from: from - 1, to, insert: `[@${completion.label}]` }],
      selection: { anchor: to - 1 } // Between citekey and ]
    })
  } else if (citeStyle === 'in-text-suffix' && noBrackets) {
    // We should add square brackets after the completion text
    view.dispatch({
      changes: [{ from, to, insert: `${completion.label} []` }],
      selection: { anchor: to - 1 } // Inside []
    })
  } else {
    // Otherwise: citeStyle was in-text or there were brackets surrounding the
    // citekey, so we can simply replace it
    view.dispatch({ changes: [{ from, to, insert: String(completion.label) }] })
  }
}

export const citations: AutocompletePlugin = {
  applies (ctx) {
    // A valid citekey position is: Beginning of the line (citekey without square
    // brackets), after a square bracket open (regular citation without prefix),
    // or after a space (either a standalone citation or within square brackets
    // but with a prefix). Also, the citekey can be prefixed with a -.
    if (ctx.state.doc.sliceString(ctx.pos - 1, ctx.pos) !== '@') {
      return false // Only applies after the user typed an @
    }

    const lineObject = ctx.state.doc.lineAt(ctx.pos)

    if (ctx.pos - lineObject.from === 1) {
      return true // Start of Line with an '@' -> Definitely a citation
    }

    const charBefore = ctx.state.doc.sliceString(ctx.pos - 2, ctx.pos - 1)
    if ([ ' ', '[', '-' ].includes(charBefore)) {
      return true // Valid char in front of the @
    }

    return false
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = ctx.state.field(citekeyUpdateField)
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query) || (entry.info as string|undefined)?.toLowerCase().includes(query)
    })
  },
  fields: [citekeyUpdateField]
}
