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
  type CompletionContext,
  autocompletion,
} from '@codemirror/autocomplete'
import { EditorState, type StateField } from '@codemirror/state'
import { codeBlocks } from './code-blocks'
import { citations } from './citations'
import { snippets } from './snippets'
import { files } from './files'
import { tags } from './tags'
import { headings } from './headings'

export interface AutocompletePlugin {
  /**
   * This function is frequently called and should return a start position
   * if the plugin detects a string that it can autocomplete.
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
   * the current query the user has typed. The query can be an empty string,
   * in which case, all entries should be returned
   *
   * @param   {CompletionContext}  ctx    The current completion context.
   * @param   {string}             query  The current query.
   *
   * @return  {Completion[]}              The list of available completions
   */
  entries: (ctx: CompletionContext, query: string) => Completion[]
  /* StateFields required for the plugin */
  fields?: Array<StateField<unknown>>
  /**
   * Whether Codemirror should filter Completion entries
   *
   * If `false`, then it is up to the `entries` implementation to
   * sort and filter Completions appropriately.
   */
  filter?: boolean
}

const forbiddenTokens = [
  'YAMLFrontmatterStart',
  'YAMLFrontmatterEnd',
  'MathEquation'
]

/**
 * Get the first completion plugin which applies for the provided context.
 *
 * @param {CompletionContext} ctx
 *
 * @return {{ plugin: AutocompletePlugin, from: number }?}
 */
function completionContext (ctx: CompletionContext): { plugin: AutocompletePlugin, from: number } | null {
  if (ctx.tokenBefore(forbiddenTokens) !== null) {
    return null
  }

  // Headings must be checked before tags.
  for (const plugin of [
    codeBlocks,
    citations,
    files,
    headings,
    tags,
    snippets
  ]) {
    const from = plugin.applies(ctx)
    if (from !== false) {
      return { plugin, from }
    }
  }

  return null
}

export const autocompleteSource: CompletionSource = function (ctx): CompletionResult | null {
  const context = completionContext(ctx)
  if (context === null) {
    return null
  }

  const { plugin, from: startPos } = context
  const query = ctx.state.sliceDoc(startPos, ctx.pos)

  return {
    from: startPos,
    options: plugin.entries(ctx, query),
    filter: plugin.filter,
    update: (current, from, to, ctx) => {
      const context = completionContext(ctx)
      if (context === null || context.plugin !== plugin || context.from !== from) {
        return null
      }

      // Reuse the options if the query is still valid.
      // This is similar to using `validFor`, but without
      // maintaining separate regexes per plugin.
      const options = plugin.filter === false
        ? plugin.entries(ctx, ctx.state.sliceDoc(from, to))
        : current.options

      return { ...current, from, to, options }
    }
  }
}

export const autocomplete = [
  EditorState.languageData.of(() => [
    { autocomplete: autocompleteSource }
  ]),
  autocompletion({
    activateOnTyping: true, // Always show immediately
    selectOnOpen: true,
    closeOnBlur: true,
    maxRenderedOptions: 20,
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
