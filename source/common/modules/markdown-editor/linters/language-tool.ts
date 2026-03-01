/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LanguageTool Linter
 * CVM-Role:        Linter
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This linter interacts with the LanguageTool API to provide
 *                  spellcheck, grammar support, and further typographic help.
 *
 * END HEADER
 */

import { linter, type Diagnostic, type Action, setDiagnostics } from '@codemirror/lint'
import { extractTextnodes, markdownToAST } from '@common/modules/markdown-utils'
import { configField } from '../util/configuration'
import type { LanguageToolAPIMatch, LanguageToolLinterRequest, LanguageToolLinterResponse } from '@providers/commands/language-tool'
import { type EditorState, StateEffect, StateField } from '@codemirror/state'
import extractYamlFrontmatter from 'source/common/util/extract-yaml-frontmatter'
import { EditorView } from '@codemirror/view'
import { trans } from 'source/common/i18n-renderer'
import type { LanguageToolIgnoredRuleEntry } from '@providers/config/get-config-template'
import { changesFieldEffectFactory, getDiagnostics, hideLinterToolTipEffect, prepareDiagnostics, refreshLinterEffect, TEXTNODE_FILTER } from './utils'
import { ensureSyntaxTree } from '@codemirror/language'
import type { TextNode } from '../../markdown-utils/markdown-ast'
import { genericTextNode } from '../../markdown-utils/markdown-ast/generic-text-node'
import type { DictionaryRecord } from 'source/app/service-providers/dictionary'

const ipcRenderer = window.ipc

// store the local dictionary for later filtering
const userDictionary: Set<string> = new Set()

function refreshUserDictionary (): void {
  userDictionary.clear()

  ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'get-user-dictionary' }
  ).then((dictionary: DictionaryRecord[]) => {
    for (const rec of dictionary) {
      userDictionary.add(rec.word)
    }
  }).catch(console.error)
}

// watch the dictionary-provider to update the user dictionary
ipcRenderer.on('dictionary-provider', (event, message) => {
  const { command } = message

  if (command === 'invalidate-dict') {
    refreshUserDictionary()
  }
})

/**
 * Utility function that can extract a list of all suggestions for a misspelling
 * that LanguageTool has produced.
 *
 * @param   {Diagnostic}     diag  The diagnostic
 *
 * @return  {string[]|null}        Returns either null, if there are no
 *                                 suggestions to extract, or a list of those
 *                                 suggestions.
 */
export function extractLTSpellcheckSuggestionsFrom (diag: Diagnostic): string[]|null {
  if (!isLanguageToolMisspelling(diag)) {
    return null
  }

  if (diag.actions === undefined) {
    return null
  }

  return diag.actions
    .filter(action => action.markClass === 'cm-ltSuggestAction')
    .map(action => action.name) // NOTE: If we ever change the name value below in the linter, we must adapt this line, too!
}

/**
 * Checks whether the provided diagnostic corresponds to a misspelling as
 * produced by the LanguageTool linter.
 *
 * @param   {Diagnostic}  diag  The diagnostic to check
 *
 * @return  {boolean}           Whether the diagnostic describes a spellcheck error.
 */
export function isLanguageToolMisspelling (diag: Diagnostic): boolean {
  return diag.source === 'language-tool(misspelling)'
}

export interface LanguageToolStateField {
  running: boolean
  lastDetectedLanguage: string
  supportedLanguages: string[]
  overrideLanguage: 'auto'|string
  lastError: string|undefined
  disabledRules: string[]
}

export const updateLTState = StateEffect.define<Partial<LanguageToolStateField>>()

export const languageToolState = StateField.define<LanguageToolStateField>({
  create: (state) => {
    // populate the user dictionary
    refreshUserDictionary()

    let overrideLanguage = 'auto'
    // Extract YAML frontmatter "lang" property if present and correct. This is
    // only done on startup to save code, and since users will rarely change an
    // explicitly given language (and when they do, it won't bother them to
    // once more change the language in the linter when not closing the doc.)
    const { frontmatter } = extractYamlFrontmatter(state.sliceDoc())
    // NOTE: Relatively simple Regex, nothing to write home about.
    if (typeof frontmatter?.lang === 'string' && /^[a-z]{2,3}(-[A-Z]{2,})?/.test(frontmatter.lang)) {
      overrideLanguage = frontmatter.lang
    }

    return {
      running: false,
      lastDetectedLanguage: 'auto',
      lastError: undefined,
      overrideLanguage,
      supportedLanguages: [],
      disabledRules: []
    }
  },
  update (value, transaction) {
    for (const e of transaction.effects) {
      if (e.is(updateLTState)) {
        value.running = e.value.running ?? value.running
        value.lastDetectedLanguage = e.value.lastDetectedLanguage ?? value.lastDetectedLanguage
        value.lastError = e.value.lastError
        value.supportedLanguages = e.value.supportedLanguages ?? value.supportedLanguages
        value.overrideLanguage = e.value.overrideLanguage ?? value.overrideLanguage
        value.disabledRules = e.value.disabledRules ?? value.disabledRules
      }
    }

    return value
  }
})

/**
 * This helper function converts a list of LanguageTool API matches into a list of linter Diagnostics
 */
function generateLTDiagnostics (state: EditorState, matches: LanguageToolAPIMatch[], textNodes: TextNode[], offset: number): Diagnostic[] {
  const diagnostics: Diagnostic[] = []
  for (const match of matches) {
    const matchFrom: number = offset + match.offset
    const matchTo: number = offset + match.offset + match.length

    // Only include diagnostics overlapping with TextNodes.
    if (!textNodes.some(node => (matchFrom >= node.from && matchTo <= node.to))) { continue }

    const word = state.sliceDoc(matchFrom, matchTo)
    const issueType = match.rule.issueType
    // skip matches for words in the local dictionary
    if (issueType === 'misspelling' && userDictionary.has(word)) { continue }

    const source = `language-tool(${issueType})`
    const severity = (issueType === 'style')
      ? 'info'
      : (issueType === 'misspelling') ? 'error' : 'warning'

    const dia: Diagnostic = {
      from: matchFrom,
      to: matchTo,
      message: match.message,
      severity,
      source
    }

    const actions: Action[] = []
    if (match.replacements.length > 0) {
      // Show at most 10 actions to not overload those messages
      let i = 0
      for (const { value } of match.replacements) {
        if (i === 10) {
          break
        }
        i++

        actions.push({
          name: value,
          markClass: 'cm-ltSuggestAction',
          apply (view, from, to) {
            view.dispatch({ changes: { from, to, insert: value } })
          }
        })
      }
    }

    actions.push({
      name: trans('Disable Rule'),
      markClass: 'cm-ltDisableAction',
      apply (view) {
        // In order to ignore a rule, we do two things. First, we keep the
        // local ignoring-mechanism from @benniekiss, because that will allow us
        // to programmatically re-run the linter and properly hide the
        // corresponding linter match as soon as the user ignores the rule. At
        // the same time, we add the list to the global ignore list so that from
        // the next call to the API, that rule won't even show up. As soon as
        // the user switches files (and thus, our local ignore list cache is
        // cleared), we don't even need that info anymore, so we should be
        // golden.

        const payload: LanguageToolIgnoredRuleEntry = {
          description: match.rule.description,
          id: match.rule.id,
          category: match.rule.category.name
        }

        ipcRenderer.invoke('application', {
          command: 'add-language-tool-ignore-rule',
          payload
        }).catch(err => console.error(err))

        const disabledRules = [...view.state.field(languageToolState).disabledRules]
        disabledRules.push(match.rule.id)

        view.dispatch({ effects: [
          updateLTState.of({ disabledRules: disabledRules }),
          ltChangesEffect.of({ from: 0, to: view.state.doc.length }),
          hideLinterToolTipEffect.of(true),
          refreshLinterEffect.of(true)
        ] })
      }
    })

    dia.actions = actions

    diagnostics.push(dia)
  }

  return diagnostics
}

/**
 * This helper chunks a range based on TextNode boundaries. It keeps each chunk
 * below `maxSize`, and it splits individual TextNodes if they are too large.
 */
function chunkContext (from: number, to: number, maxSize: number, textNodes: TextNode[], splitNodes: boolean = true, granularity: 'sentence'|'word' = 'sentence'): { start: number, end?: number }[] {
  const chunks: { start: number, end?: number }[] = []

  let length = to - from
  // The range is too large, so we must chunk it
  if (maxSize > 0 && length >= maxSize) {
    const n_chunks = Math.ceil(length / maxSize)
    const chunkLength = Math.floor(length / n_chunks)

    let start = from
    // We don't want to exceed our range limits
    let end = Math.min(start + chunkLength, to)
    let chunk: { start: number, end?: number } = { start }

    for (const node of textNodes) {
      let start = node.from

      // If the node fits within the context,
      // extend the chunk end and continue
      if (node.to <= end) {
        chunk.end = node.to
        continue
      // Check if the node start is within the context.
      // If it is, extend the chunk up to this node.
      // Otherwise, the formatting between nodes
      // will be discarded if it exceeds the context.
      } else if (start <= end) {
        chunk.end = start
      }

      chunks.push(chunk)

      // If the node itself is larger than the context, then it too
      // needs to be chunked. We first determine the chunk boundaries
      // based on sentences and convert them to TextNodes. When we
      // recurse, we set the `granularity` to `word`, in case sentences
      // exceed the context and they need to be chunked, as well.
      if (splitNodes && node.to - node.from >= maxSize) {
        const locale: string = window.config.get('appLang')
        const segmenter = new Intl.Segmenter(locale, { granularity })

        const newNodes: TextNode[] = []
        for (const { segment, index, isWordLike } of segmenter.segment(node.value)) {
          const newFrom = node.from + index
          const newTo = newFrom + segment.length
          if (granularity === 'sentence' || isWordLike === true) {
            newNodes.push(genericTextNode(newFrom, newTo, segment))
          }
        }

        chunks.push(...chunkContext(node.from, node.to, maxSize, newNodes, false, 'word'))
        start = node.to
      }

      end = Math.min(start + chunkLength, to)

      chunk = { start, end }
    }

    if (chunk.end !== undefined) {
      chunks.push(chunk)
    }
  // The range is within `maxSize`, so there's nothing to do
  } else {
    chunks.push({ start: from, end: to })
  }

  return chunks
}

export const { effect: ltChangesEffect, field: ltChangesField } = changesFieldEffectFactory()

/**
 * Defines a spellchecker that runs over the text content of the document and
 * highlights misspelled words
 */
const ltLinter = linter(async view => {
  const { lintLanguageTool, languageToolCharsPerRequest } = view.state.field(configField)

  if (!lintLanguageTool) {
    return []
  }

  // If the linter was already running, it's probably in the middle
  // of processing several chunks from a previous dispatch. It will
  // cancel itself if it detects that the doc has changed since it
  // started
  if (view.state.field(languageToolState).running) {
    return getDiagnostics(view.state, 'language-tool')
  }

  view.dispatch({ effects: updateLTState.of({ running: true })  })

  const state = view.state
  const ast = markdownToAST(state.sliceDoc(), ensureSyntaxTree(state, state.doc.length))

  const { ranges, diagnostics } = prepareDiagnostics(state, ltChangesField, 'language-tool', 6, TEXTNODE_FILTER)

  for (let range = 0; range < ranges.length; range++) {
    const { from, to } = ranges[range]

    // Extract TextNodes that fall within our range to later filter diagnostics that only cover these nodes.
    const textNodes = extractTextnodes(ast, (node) => node.from < to && node.to > from)
    // If there are no TextNodes in this region, move on to the next.
    if (!(textNodes.length > 0)) { continue }

    // Language Tool has a per-request character limit in the public APIs, so we
    // need to chunk long documents in order for them to be processed at all.
    const chunks = chunkContext(from, to, languageToolCharsPerRequest, textNodes)

    let numRetries = 0
    for (let chunk = 0; chunk < chunks.length; chunk++) {
      const { start, end } = chunks[chunk]

      const text = state.sliceDoc(start, end)

      const response: LanguageToolLinterResponse = await ipcRenderer.invoke('application', {
        command: 'run-language-tool',
        payload: {
          // Send the entire document to the API as `text`
          data: { annotation: [{ text }] },
          language: view.state.field(languageToolState).overrideLanguage
        } satisfies LanguageToolLinterRequest
      })

      if (response === undefined || typeof response === 'string') {
        view.dispatch({ effects: updateLTState.of({ lastError: response }) })

        // Return after failing too many times
        if (numRetries > 3) {
          return diagnostics
        }

        // Try the chunk again
        chunk--
        continue
      }

      numRetries = 0

      const [ ltSuggestions, supportedLanguages ] = response

      if (ltSuggestions.matches.length === 0) {
        continue // Hooray, nothing wrong!
      }

      diagnostics.push(...generateLTDiagnostics(state, ltSuggestions.matches, textNodes, start))

      // When using `setDiagnostics`, we have to return a
      // complete set, not just the ones from this linter
      const allDiagnostics = getDiagnostics(view.state, 'language-tool', false).concat(diagnostics)
      const remainingRanges = [{ from: start, to }  ,...ranges.slice(range + 1) ]

      // Make sure that the doc hasn't changed since we started linting.
      // This is how the native codemirror implementation does the check
      if (view.state.doc === state.doc) {
        view.dispatch(
          // Return the diagnostics as soon as possible
          setDiagnostics(view.state, allDiagnostics),
          {
            effects: [
              ltChangesEffect.of(remainingRanges),
              updateLTState.of({
                lastDetectedLanguage: ltSuggestions.language.detectedLanguage.code,
                supportedLanguages
              }),
            ]
          }
        )
      } else {
        console.log('[Language Tool] Cancelling LanguageTool lint...')
        view.dispatch({ effects: updateLTState.of({ running: false }) })

        return []
      }
    }
  }

  view.dispatch({ effects: [
    updateLTState.of({ running: false }),
    ltChangesEffect.of(null),
  ] })

  return diagnostics
})

const languagetoolTheme = EditorView.theme({
  '.cm-diagnosticAction.cm-ltDisableAction': {
    backgroundColor: '#af5151'
  }
})

export const languageTool = [
  ltLinter,
  languageToolState,
  languagetoolTheme,
  ltChangesField
]
