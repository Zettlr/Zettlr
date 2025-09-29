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
import { StateEffect, StateField, type Transaction } from '@codemirror/state'
import extractYamlFrontmatter from 'source/common/util/extract-yaml-frontmatter'
import type { ViewUpdate } from '@codemirror/view'
import { trans } from 'source/common/i18n-renderer'
import type { LanguageToolIgnoredRuleEntry } from '@providers/config/get-config-template'

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

// watch the dictionary-provider to update the user dictionary
ipcRenderer.on('dictionary-provider', (event, message) => {
  const { command } = message

  if (command === 'invalidate-dict') {
    refreshUserDictionary()
  }
})

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
 * Defines a spellchecker that runs over the text content of the document and
 * highlights misspelled words
 */
const ltLinter = linter(async view => {
  if (!view.state.field(configField).lintLanguageTool) {
    return []
  }

  view.dispatch({ effects: updateLTState.of({ running: true }) })

  const diagnostics: Diagnostic[] = []

  const ast = markdownToAST(view.state.doc.toString())
  // Extract TextNodes to later filter diagnostics that only cover these nodes.
  const textNodes = extractTextnodes(ast)

  const response: LanguageToolLinterResponse = await ipcRenderer.invoke('application', {
    command: 'run-language-tool',
    payload: {
      // Send the entire document to the API as `text`
      data: { annotation: [{ text: view.state.sliceDoc() }] },
      language: view.state.field(languageToolState).overrideLanguage
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
    if (!textNodes.some(node => (matchFrom >= node.from && matchTo <= node.to))) { continue }

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
          apply (view, from, to) {
            view.dispatch({ changes: { from, to, insert: value } })
          }
        })
      }
    }

    // TODO: Add a class and styling once
    // https://github.com/codemirror/lint/commit/50bd1188fe15d92b03cc5c1ea4ffbee44f28a090
    // lands in a release
    actions.push({
      name: trans('Disable Rule'),
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

export const languageTool = [
  ltLinter,
  languageToolState
]
