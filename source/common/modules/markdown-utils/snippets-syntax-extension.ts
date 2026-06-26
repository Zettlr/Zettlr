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
import { matchBrackets } from '@codemirror/language'
import { RangeSet, type EditorState, type Range } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, MatchDecorator, ViewPlugin, type ViewUpdate } from '@codemirror/view'

// Helper interface for nested snippet ranges
interface SnippetRange {
  id: {
    type: 'var'|'num', // Whether the placeholder is a variable or numbered tabstop
    from: number,
    to: number
  },
  from: number,
  to: number
}

// The `s` flag is important for multi-line snippets
const placeholderRe = /(?<placeholder>\$\{(?:(?<var>[A-Z_]+)|(?<num>\d+)):).+\}/ds

const snippetMarkDeco = Decoration.mark({ class: 'cm-tm-snippet-mark' })
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

// Handles tabstops without default values: `$1`
const tabstopDecorator = new MatchDecorator({
  regexp: /\$(?<num>\d+)/dg,
  decorate: (add, from, _, match, view) => {
    if (match.indices?.groups?.num === undefined) {
      return
    }

    // Note: `from` is a document-relative position corresponding to the
    // beginning of the matched text, while `start` and `end` are relative
    // to whatever text was provided to the regex engine. In this case,
    // codemirror matches per-line, so `start` and `end` are line-relative.
    // i.e., a `start` of 0 corresponds to `view.state.doc.lineAt(from).from`.
    //
    // Furthermore, `from` cannot be used to get document-relative  positions
    // for `start` and `end`, as `from` could refer to a position anywhere in the
    // line. It would only work as an offset if `from` was at the start of a line.
    const line = view.state.doc.lineAt(from)
    const [ start, end ] = match.indices.groups.num

    add(from, from + 1, snippetMarkDeco)
    add(line.from + start, line.from + end, tabstopDeco)
  }
})

// Handles variables without default values: `$CURRENT_YEAR`
const variableDecorator = new MatchDecorator({
  regexp: /\$(?<var>[A-Z_]+)/dg,
  decorate: (add, from, _, match, view) => {
    if (match.indices?.groups?.var === undefined) {
      return
    }

    // Note: `from` is a document-relative position corresponding to the
    // beginning of the matched text, while `start` and `end` are relative
    // to whatever text was provided to the regex engine. In this case,
    // codemirror matches per-line, so `start` and `end` are line-relative.
    // i.e., a `start` of 0 corresponds to `view.state.doc.lineAt(from).from`.
    //
    // Furthermore, `from` cannot be used to get document-relative  positions
    // for `start` and `end`, as `from` could refer to a position anywhere in the
    // line. It would only work as an offset if `from` was at the start of a line.
    const line = view.state.doc.lineAt(from)
    const [ start, end ] = match.indices.groups.var

    add(from, from + 1, snippetMarkDeco)
    add(line.from + start, line.from + end, SUPPORTED_VARIABLES.includes(match.groups!.var) ? varDeco : invalidVarDeco)
  }
})

/**
 * Parse nested snippet placeholder ranges from a string
 *
 * @param {EditorState}   state   The editor state
 * @param {number}        pos     The document-relative start position of `text`
 * @param {string}        text    The text to parse
 *
 * @returns {SnippetRange[]}      A list of parsed snippet placeholder ranges
 */
function getNestedRanges (state: EditorState, pos: number, text: string): SnippetRange[] {
  const ranges: SnippetRange[] = []

  const match = placeholderRe.exec(text)
  if (!match?.indices?.groups?.placeholder) {
    return ranges
  }

  const [ start, end ] = match.indices.groups.placeholder

  // We can limit the search distance to the length of the match
  // since it encompasses the maximum number of brackets
  const brackets = matchBrackets(state, pos + start + 1, 1, { maxScanDistance: match[0].length })

  // No matching bracket was found
  if (!brackets || !brackets.matched || !brackets.end) {
    return ranges
  }

  ranges.push({
    id: {
      type: match?.groups?.num !== undefined ? 'num' : 'var',
      from: pos + start + 2,
      to: pos + end - 1,
    },
    from: pos + end,
    to: brackets.end.from
  })

  // Recurse on the interior text of the match. This is everything after the
  // colon and before the final brace.
  ranges.push(...getNestedRanges(state, pos + end, text.slice(end)))

  return ranges
}

/**
 * Generates a `DecorationSet` for snippet placeholders with default values,
 * handling arbitrarily nested placeholders.
 *
 * @param   {EditorView}    view  The editor view
 *
 * @returns {DecorationSet}       The generated decorations.
 */
function renderPlaceholders (view: EditorView): DecorationSet {
  const decos: Range<Decoration>[] = []

  for (const range of view.visibleRanges) {
    const text = view.state.sliceDoc(range.from, range.to)
    const nested = getNestedRanges(view.state, range.from, text)

    for (const { id, from, to } of nested) {
      let idDeco = tabstopDeco
      let defaultDeco = placeholderDeco

      if (id.type === 'var') {
        idDeco = SUPPORTED_VARIABLES.includes(view.state.sliceDoc(id.from, id.to)) ? varDeco : invalidVarDeco
        defaultDeco = varPlaceholderDeco
      }

      // The opening mark, `${`
      decos.push(snippetMarkDeco.range(id.from - 2, id.from))

      // Placeholder id, either the variable or number
      decos.push(idDeco.range(id.from, id.to))

      // The colon, `:`
      decos.push(snippetMarkDeco.range(id.to, id.to + 1))

      // Only add a text decoration if not empty to avoid crashing the plugin
      if (from !== to) {
        decos.push(defaultDeco.range(from, to))
      }

      // The closing mark, `}`
      decos.push(snippetMarkDeco.range(to, to + 1))
    }
  }

  return Decoration.set(decos, true)
}

/**
 * This plugin uses the snippets match decorator to highlight snippet variables.
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {ViewPlugin}        The finished view plugin
 */
const snippetsHighlight = ViewPlugin.define(view => ({
  tabstops: tabstopDecorator.createDeco(view),
  variables: variableDecorator.createDeco(view),
  placeholders: renderPlaceholders(view),
  update (u: ViewUpdate) {
    this.tabstops = tabstopDecorator.updateDeco(u, this.tabstops)
    this.variables = variableDecorator.updateDeco(u, this.variables)

    if (u.docChanged || u.viewportChanged) {
      this.placeholders = renderPlaceholders(view)
    }
  }
}), { decorations: v => RangeSet.join([ v.tabstops, v.variables, v.placeholders ]) })

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
  //
  // The selectors here are a little verbose so that the syntax highlighting from
  // the markdown parser is overridden. `cm-content-span` and `cm-pandoc-attribute`
  // nodes particularly conflict with the snippet styling.
  '.cm-tm-snippet-mark, .cm-tm-snippet-mark > *': { color: '#859900 !important' },
  '.cm-tm-tabstop, .cm-tm-tabstop > *': { color: '#2aa198 !important' }, // cyan
  '.cm-tm-placeholder, .cm-tm-placeholder > *': { color: '#2aa198 !important' }, // cyan
  '.cm-tm-variable, .cm-tm-variable > *': { color: '#b58900 !important' }, // yellow
  '.cm-tm-variable-placeholder, .cm-tm-variable-placeholder > *': { color: '#6c71c4 !important' }, // violet
  '.cm-tm-false-variable, .cm-tm-false-variable > *': { color: '#dc322f !important' } // red
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
