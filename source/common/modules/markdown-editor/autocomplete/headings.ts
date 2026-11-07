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

import type { EditorState } from '@codemirror/state'
import { type AutocompletePlugin } from '.'
import { tocField } from '../plugins/toc-field'

function getHeadingEntries (state: EditorState): { label: string, apply: string }[] {
  const entries = state.field(tocField)

  return entries.map(entry => {
    return {
      label: entry.text,
      apply: entry.id
    }
  })

}

export const headings: AutocompletePlugin = {
  filter: true,
  applies (ctx) {
    const token = ctx.tokenBefore(['URL'])

    if (token === null || !token.text.startsWith('#')) {
      return false
    }

    return token.from + 1
  },
  entries (ctx) {
    return getHeadingEntries(ctx.state)
  },
}
