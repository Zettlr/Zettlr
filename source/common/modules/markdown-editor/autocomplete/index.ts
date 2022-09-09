import {
  Completion,
  CompletionSource,
  CompletionResult,
  autocompletion,
  CompletionContext
} from '@codemirror/autocomplete'
import { StateField } from '@codemirror/state'
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
   * @return  {boolean}                 True as soon as the plugin can
   *                                    autocomplete something.
   */
  applies: (ctx: CompletionContext) => boolean
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
  entries: (ctx: CompletionContext, query: string) => Completion[],
  fields?: StateField<any>[]
}

const forbiddenTokens = [
  'YAMLFrontmatterKey',
  'YAMLFrontmatterString',
  'YAMLFrontmatterBoolean',
  'YAMLFrontmatterNumber',
  'YAMLFrontmatterPlain',
  'YAMLFrontmatterMap',
  'YAMLFrontmatterSeq',
  'YAMLFrontmatterPair',
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

  if (codeBlocks.applies(ctx)) {
    plugin = codeBlocks
  } else if (citations.applies(ctx)) {
    plugin = citations
  } else if (files.applies(ctx)) {
    plugin = files
  } else if (headings.applies(ctx)) {
    plugin = headings // NOTE: Headings has to be checked before tags
  } else if (tags.applies(ctx)) {
    plugin = tags
  } else if (snippets.applies(ctx)) {
    plugin = snippets
  }

  if (plugin !== undefined) {
    return {
      from: ctx.pos,
      options: plugin.entries(ctx, ''),
      filter: false,
      update: (current, from, to, ctx) => {
        const query = ctx.state.doc.sliceString(from, to).toLowerCase()
        current.options = (plugin as AutocompletePlugin).entries(ctx, query)
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
    selectOnOpen: false, // But never pre-select anything
    closeOnBlur: true,
    maxRenderedOptions: 20,
    override: [autocompleteSource]
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
