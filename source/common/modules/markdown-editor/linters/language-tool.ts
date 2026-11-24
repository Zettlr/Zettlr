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

import { linter, type Diagnostic, type Action } from '@codemirror/lint'
import { extractTextnodes, markdownToAST } from '@common/modules/markdown-utils'
import { configField } from '../util/configuration'
import type { LanguageToolLinterRequest, LanguageToolLinterResponse } from '@providers/commands/language-tool'
import { type EditorState, StateEffect, StateField, type Transaction } from '@codemirror/state'
import extractYamlFrontmatter from 'source/common/util/extract-yaml-frontmatter'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { trans } from 'source/common/i18n-renderer'
import type { LanguageToolIgnoredRuleEntry } from '@providers/config/get-config-template'
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language'

const ipcRenderer = window.ipc

// store the local dictionary for later filtering
const userDictionary: Set<string> = new Set()

function refreshUserDictionary (): void {
  userDictionary.clear()

  ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'get-user-dictionary' }
  ).then((dictionary: string[]) => {
    for (const word of dictionary) {
      userDictionary.add(word)
    }
  }).catch(console.error)
}

/**
 * Extracts a `lang` property from the state's YAML frontmatter under the
 * following conditions:
 *
 * 1. The state contains something that looks like a YAML frontmatter
 * 2. The `lang` property is present and valid
 * 3. The property contains a language code in BCP-47 format.
 *
 * If either conditions do not hold, the function returns undefined.
 *
 * @param   {EditorState}  state  The Editor state
 *
 * @return  {string}              The detected language, undefined otherwise.
 */
function extractLangFromYAML (state: EditorState): string|undefined {
  const { frontmatter } = extractYamlFrontmatter(state.sliceDoc())
  // NOTE: Relatively simple Regex, nothing to write home about.
  if (typeof frontmatter?.lang === 'string' && /^[a-z]{2,3}(-[A-Z]{2,})?$/.test(frontmatter.lang)) {
    return frontmatter.lang
  } else {
    return undefined
  }
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

    return {
      running: false,
      lastDetectedLanguage: 'auto',
      lastError: undefined,
      overrideLanguage: extractLangFromYAML(state) ?? 'auto',
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

// Hide the tooltip when the `Ignore Rule` action is selected.
function hideOn (tr: Transaction): boolean | null {
  for (const e of tr.effects) {
    if (e.is(updateLTState)) {
      if (e.value.disabledRules) {
        return true
      }
    }
  }

  return null
}

// Re-run the linter when `ignoreRules` are updated.
function needsRefresh (update: ViewUpdate): boolean {
  for (const tr of update.transactions) {
    for (const e of tr.effects) {
      if (e.is(updateLTState)) {
        if (e.value.disabledRules) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Utility function that returns the ranges of values for text-only YAML
 * frontmatter properties so that we can lint those through LanguageTool, too.
 *
 * @param   {EditorState}  state  The editor state
 *
 * @return  {Array}               A list of ranges in the frontmatter that contain text.
 */
function extractFrontmatterTextRanges (state: EditorState): Array<{ from: number, to: number }> {
  // YAML grammar structure (see https://code.haverbeke.berlin/lezer/yaml/src/branch/main/src/yaml.grammar)
  // NOTE: Also see the `isFrontmatterKeywordOrTag` utility function in the
  // click-listener plugin for the implementation we took this here from.
  // TODO: Merge this function with the `isFrontmatterKeywordOrTag` function at
  // some point, because a lot of the detection logic is actually shared.

  const ranges: Array<{ from: number, to: number }> = []

  // These are the node types of the *values* we accept
  const ALLOWED_TEXT_NODE_TYPES = [
    'Literal', // Simple one-line unquoted value
    'QuotedLiteral', // Simple one-line quoted value
    'BlockLiteral', // Block/Multiline unquoted value, has one child `BlockLiteralContent` that we want.
  ]
  // These are the actual properties we consider "text", loosely oriented at the
  // variables Pandoc supports: https://pandoc.org/MANUAL.html#variables
  const TEXT_ONLY_PROPERTIES = [
    'title',
    'subtitle',
    'abstract',
    'abstract-title',
    'description',
    'shorttitle',
    'shortsubtitle',
    'thanks'
  ]

  syntaxTree(state).iterate({
    enter (node) {
      if (!ALLOWED_TEXT_NODE_TYPES.some(type => node.type.is(type))) {
        // console.log(`Wrong node: ${node.type.name}`)
        return
      }

      let parent = node.node.parent
      while (parent !== null) {
        if (parent.type.is('YAMLFrontmatter')) {
          break
        }
        parent = parent.parent
      }

      if (!parent || !parent.type.is('YAMLFrontmatter')) {
        return
      }

      // It's definitely a YAML (quoted) literal somewhere in the frontmatter. It
      // must be furthermore a child of a FlowSequence or BlockSequence, or a Pair.
      // If it's part of a sequence, it additionally has a parent called "Item"
      const directParent = node.node.parent
      const valueContainer = directParent?.type.name === 'Item' ? directParent.parent : directParent
      if (valueContainer == null || ![ 'FlowSequence', 'BlockSequence', 'Pair' ].includes(valueContainer.type.name)) {
        return
      }

      // It's a literal in a flow or block sequence, or direct part of a pair.
      const maybePair = valueContainer.type.name === 'Pair' ? valueContainer : valueContainer.parent
      if (!maybePair || !maybePair.type.is('Pair')) {
        return
      }

      // It's also part of a Pair, which must have a "Key" with either value
      // "keywords" or "tags".
      const key = maybePair.getChild('Key')
      if (key === null) {
        return
      }

      const keyValue = state.sliceDoc(key.from, key.to)
      if (!TEXT_ONLY_PROPERTIES.includes(keyValue)) {
        return
      }

      // Final check: This could be a nested property. By definition, tags/keywords
      // must be the top-level element. Thus, the parent chain of the Pair must be:
      // Pair -> BlockMapping -> Document
      // (The frontmatter is one large BlockMapping)
      if (
        !maybePair.parent || !maybePair.parent.type.is('BlockMapping')
        || !maybePair.parent?.parent || !maybePair.parent.parent.type.is('Document')
      ) {
        return
      }

      if (node.type.is('BlockLiteral')) {
        // `key: | <multiline content>`
        const content = node.node.getChild('BlockLiteralContent')
        if (content !== null) {
          ranges.push({ from: content.from, to: content.to })
        }
      } else if (node.type.is('QuotedLiteral')) {
        ranges.push({ from: node.from + 1, to: node.to - 1 })
      } else {
        // Regular literal
        ranges.push({ from: node.from, to: node.to })
      }
    }
  })

  return ranges
}

/**
 * Defines a spellchecker that runs over the text content of the document and
 * highlights misspelled words
 */
const ltLinter = linter(async view => {
  if (!view.state.field(configField).lintLanguageTool) {
    return []
  }

  view.dispatch({ effects: updateLTState.of({ running: true }) })

  const diagnostics: Diagnostic[] = []

  // Determine the language: First, extract a potential overrideLanguage. It
  // will return 
  const overrideLanguage = extractLangFromYAML(view.state)
  const oldOverride = view.state.field(languageToolState).overrideLanguage
  const useOverride = overrideLanguage ?? oldOverride

  const ast = markdownToAST(view.state.doc.toString(), ensureSyntaxTree(view.state, view.state.doc.length))
  // Extract TextNodes to later filter diagnostics that only cover these nodes.
  const textNodes = extractTextnodes(ast)
  const yamlTextRanges = extractFrontmatterTextRanges(view.state)

  const response: LanguageToolLinterResponse = await ipcRenderer.invoke('application', {
    command: 'run-language-tool',
    payload: {
      // Send the entire document to the API as `text`
      data: { annotation: [{ text: view.state.sliceDoc() }] },
      language: useOverride
    } satisfies LanguageToolLinterRequest
  })

  view.dispatch({ effects: updateLTState.of({ running: false }) })

  if (response === undefined) {
    return [] // Could not fetch a response, but it's benign
  } else if (typeof response === 'string') {
    view.dispatch({ effects: updateLTState.of({ running: false, lastError: response }) })
    return [] // There was an error
  }

  const [ ltSuggestions, supportedLanguages ] = response

  view.dispatch({
    effects: updateLTState.of({
      running: false,
      lastDetectedLanguage: ltSuggestions.language.detectedLanguage.code,
      overrideLanguage: overrideLanguage ?? oldOverride,
      supportedLanguages
    })
  })

  if (ltSuggestions.matches.length === 0) {
    return [] // Hooray, nothing wrong!
  }

  // At this point, we have only valid suggestions that we can now insert into
  // the document.
  for (const match of ltSuggestions.matches) {
    const matchFrom: number = match.offset
    const matchTo: number = match.offset + match.length

    // Only include diagnostics overlapping with TextNodes.
    if (
      !textNodes.some(node => matchFrom >= node.from && matchTo <= node.to) &&
      !yamlTextRanges.some(range => matchFrom >= range.from && matchTo <= range.to)
    ) {
      continue
    }

    const word = view.state.sliceDoc(matchFrom, matchTo)
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

        view.dispatch({ effects: updateLTState.of({ disabledRules: disabledRules }) })
      }
    })

    dia.actions = actions

    diagnostics.push(dia)
  }

  return diagnostics
}, {
  delay: 2000, // Increase the delay to reduce server strain
  hideOn,
  needsRefresh
})

const languagetoolTheme = EditorView.theme({
  '.cm-diagnosticAction.cm-ltDisableAction': {
    backgroundColor: '#af5151'
  }
})

export const languageTool = [
  ltLinter,
  languageToolState,
  languagetoolTheme
]
