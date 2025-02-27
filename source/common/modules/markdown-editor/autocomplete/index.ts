/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Autocomplete
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the autocomplete entry file. It defines a helper
 *                  class to manage different types of autocompletes and bundles
 *                  everything together.
 *
 * END HEADER
 */

import {
  type Completion,
  type CompletionSource,
  type CompletionResult,
  autocompletion,
  type CompletionContext
} from '@codemirror/autocomplete'
import { type StateField } from '@codemirror/state'
import { codeBlocks } from './code-blocks'
import { citations } from './citations'
import { snippets } from './snippets'
import { files } from './files'
import { tags } from './tags'
import { headings } from './headings'

export interface AutocompletePlugin {
  /**
   * This function is frequently called and should return true as soon as the
   * plugin detects a string that it can autocomplete.
   *
   * @param   {CompletionContext}  ctx  The current completion context.
   *
   * @return  {number|false}            If the function returns false, the
   *                                    autocompletion does not apply. Otherwise
   *                                    returns a number -> the start pos.
   */
  applies: (ctx: CompletionContext) => number|false
  /**
   * This function is called while an autocompletion is active. It is provided
   * the current query the user has typed and should return a filtered list of
   * all autocompletion entries that match that query. NOTE that the query can
   * be an empty string, in which case all entries are expected to be returned.
   *
   * @param   {CompletionContext}  ctx    The current completion context.
   * @param   {string}             query  The current query.
   *
   * @return  {Completion[]}              The list of available completions
   */
  entries: (ctx: CompletionContext, query: string) => Completion[]
  fields?: Array<StateField<any>>
}

const forbiddenTokens = [
  'YAMLFrontmatter',
  'YAMLFrontmatterStart',
  'YAMLFrontmatterEnd',
  'MathEquation'
]

const autocompleteSource: CompletionSource = function (ctx): CompletionResult|null {
  // This function is called for every keystroke and shall determine whether to
  // actually start the autocomplete.

  // With this function we check whether we are currently within "forbidden"
  // tokens (i.e. codeblocks, YAML stuff, etc.)
  if (ctx.tokenBefore(forbiddenTokens) !== null) {
    return null
  }

  let plugin: AutocompletePlugin|undefined
  let startpos = ctx.pos

  // NOTE: Headings has to be checked before tags
  for (const p of [ codeBlocks, citations, files, headings, tags, snippets ]) {
    const res = p.applies(ctx)
    if (res !== false) {
      plugin = p
      startpos = res
      break
    }
  }

  if (plugin !== undefined) {
    const initialOptions = plugin.entries(ctx, ctx.state.doc.sliceString(startpos, ctx.pos).toLowerCase())
    return {
      from: startpos,
      options: initialOptions,
      filter: false,
      update: (current, from, to, ctx) => {
        const query = ctx.state.doc.sliceString(from, to).toLowerCase()
        current.options = plugin!.entries(ctx, query)
        return current
      }
    }
  }

  // Return null to indicate that autocomplete does not apply.
  return null
}

export const autocomplete = [
  autocompletion({
    activateOnTyping: true, // Always show immediately
    selectOnOpen: true, // But never pre-select anything
    closeOnBlur: true,
    maxRenderedOptions: 20,
    override: [autocompleteSource],
    // Do not include the default keymap. Instead, we re-define it below to
    // avoid a specific decision by CodeMirror to remap the autocomplete toggle
    // on macOS to Alt+\ which, on an Italian keyboard layout, will fail to
    // produce backticks. (See issue #5517)
    defaultKeymap: false
  }),
  // Make sure any configuration fields will be inserted into the state so that
  // the plugins can look them up and function correctly. These fields are not
  // required by the main class (MarkdownEditor), hence we do not have to re-
  // export them here.
  codeBlocks.fields ?? [],
  citations.fields ?? [],
  files.fields ?? [],
  tags.fields ?? [],
  snippets.fields ?? []
]

// Lastly, also re-export the effects which the main class (MarkdownEditor)
// requires in order to provide data for these fields.
export { citekeyUpdate } from './citations'
export { filesUpdate } from './files'
export { tagsUpdate } from './tags'
export { snippetsUpdate } from './snippets'
