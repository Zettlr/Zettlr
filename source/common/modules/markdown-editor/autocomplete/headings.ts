/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Headings Autocomplete
 * CVM-Role:        Autocomplete Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin manages insertion of internal (heading) links.
 *
 * END HEADER
 */

import { type AutocompletePlugin } from '.'
import { tocField } from '../plugins/toc-field'

export const headings: AutocompletePlugin = {
  applies (ctx) {
    // A valid citekey position is: Beginning of the line (citekey without square
    // brackets), after a square bracket open (regular citation without prefix),
    // or after a space (either a standalone citation or within square brackets
    // but with a prefix). Also, the citekey can be prefixed with a -.
    if (ctx.state.doc.sliceString(ctx.pos - 3, ctx.pos) !== '](#') {
      return false // Only applies after the user typed an # within a link
    }

    return ctx.pos
  },
  entries (ctx, query) {
    query = query.toLowerCase()
    const entries = ctx.state.field(tocField).map(entry => {
      return {
        label: entry.text,
        apply: entry.id
      }
    })
    return entries.filter(entry => {
      return entry.label.toLowerCase().includes(query)
    })
  },
  fields: []
}
