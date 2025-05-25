/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Snippet Syntax Extension
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports an extension that can be used in CMv6
 *                  editors to highlight and autocomplete Zettlr's snippet
 *                  variable syntax.
 *
 * END HEADER
 */

import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete'
import { Decoration, EditorView, MatchDecorator, ViewPlugin, type ViewUpdate } from '@codemirror/view'

const tabstopDeco = Decoration.mark({ class: 'cm-tm-tabstop' })
const placeholderDeco = Decoration.mark({ class: 'cm-tm-placeholder' })
const varDeco = Decoration.mark({ class: 'cm-tm-variable' })
const invalidVarDeco = Decoration.mark({ class: 'cm-tm-false-variable' })
const varPlaceholderDeco = Decoration.mark({ class: 'cm-tm-variable-placeholder' })

/**
 * Supported variables for Zettlr's snippets syntax
 *
 * @var {string[]}
 */
const SUPPORTED_VARIABLES = [
  'CURRENT_YEAR',
  'CURRENT_YEAR_SHORT',
  'CURRENT_MONTH',
  'CURRENT_MONTH_NAME',
  'CURRENT_MONTH_NAME_SHORT',
  'CURRENT_DATE',
  'CURRENT_HOUR',
  'CURRENT_MINUTE',
  'CURRENT_SECOND',
  'CURRENT_SECONDS_UNIX',
  'UUID',
  'CLIPBOARD',
  'ZKN_ID',
  'CURRENT_ID',
  'FILENAME',
  'DIRECTORY',
  'EXTENSION'
]

/**
 * This is the match decorator that can highlight snippet variables.
 *
 * @return  {MatchDecorator}  The snippets match decorator
 */
const snippetsDecorator = new MatchDecorator({
  // tabstops|tabstops with default|variables|variable with default
  regexp: /(?<tabstop>\$\d+)|(?<tabstopDefault>\$\{\d+:.+?\})|\$(?<var>[A-Z_]+)|\$\{(?<varDefault>[A-Z_]+):.+?\}/g,
  // tabstop and tabstopDefault -> valid tabstop
  // var and varDefault --> check the corresponding group if variable is correct
  decoration: m => {
    if (m.groups?.tabstop !== undefined) {
      return tabstopDeco
    } else if (m.groups?.tabstopDefault !== undefined) {
      return placeholderDeco
    } else if (m.groups?.var !== undefined) {
      if (SUPPORTED_VARIABLES.includes(m.groups.var)) {
        return varDeco
      } else {
        return invalidVarDeco
      }
    } else if (m.groups?.varDefault !== undefined) {
      if (SUPPORTED_VARIABLES.includes(m.groups.varDefault)) {
        return varPlaceholderDeco
      } else {
        return invalidVarDeco
      }
    } else {
      return invalidVarDeco // Default: invalid
    }
  }
})

/**
 * This plugin uses the snippets match decorator to highlight snippet variables.
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {ViewPlugin}        The finished view plugin
 */
const snippetsHighlight = ViewPlugin.define(view => ({
  decorations: snippetsDecorator.createDeco(view),
  update (u: ViewUpdate) {
    this.decorations = snippetsDecorator.updateDeco(u, this.decorations)
  }
}), { decorations: v => v.decorations })

/**
 * This function attempts to return a set of possible autocompletion results.
 *
 * @param   {CompletionContext}  context  The completion context
 *
 * @return  {CompletionResult}            Either null or a result to apply
 */
function snippetsAutocomplete (context: CompletionContext): CompletionResult|null {
  const match = context.matchBefore(/\$[\da-z_]*$/i)
  if (match === null) {
    return null
  } else {
    const existingVarContents = match.text.toLowerCase().substring(1) // Ignore the $
    return {
      from: match.from,
      options: SUPPORTED_VARIABLES
        .filter(variable => variable.toLowerCase().startsWith(existingVarContents))
        .map(variable => { return { label: '$' + variable, type: 'keyword' } })
    }
  }
}

/**
 * The theme styles the additional decorators we inject here
 */
const snippetsTheme = EditorView.theme({
  // We're using this solarized theme here: https://ethanschoonover.com/solarized/
  '.cm-tm-tabstop': { color: '#2aa198' }, // cyan
  '.cm-tm-placeholder': { color: '#2aa198' }, // cyan
  '.cm-tm-variable': { color: '#b58900' }, // yellow
  '.cm-tm-variable-placeholder': { color: '#6c71c4' }, // violet
  '.cm-tm-false-variable': { color: '#dc322f' } // red
})

/**
 * The snippet syntax extension includes support for highlighting snippet
 * variables and autocompleting them.
 *
 * @var {Extension[]}
 */
export const snippetSyntaxExtension = [
  autocompletion({
    activateOnTyping: true, // Always show immediately
    selectOnOpen: false, // But never pre-select anything
    closeOnBlur: true,
    maxRenderedOptions: 20,
    override: [snippetsAutocomplete]
  }),
  snippetsHighlight,
  snippetsTheme
]
