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
import type { LanguageToolAPIResponse, AnnotationData, Annotation } from '@providers/commands/language-tool'
import { StateEffect, StateField } from '@codemirror/state'
import extractYamlFrontmatter from 'source/common/util/extract-yaml-frontmatter'

const ipcRenderer = window.ipc

export interface LanguageToolStateField {
  running: boolean
  lastDetectedLanguage: string
  supportedLanguages: string[]
  overrideLanguage: 'auto'|string
  lastError: string|undefined
}

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
      supportedLanguages: []
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
      }
    }
    return value
  }
})

/**
 * Adjust tailing and leading whitespace between two strings.
 *
 * @param   {string}    string1  The leading string. Tailing whitespace will be adjusted.
 * @param   {string}    string2  The tailing string. Leading whitespace will be adjusted.
 *
 * @return  {[ number, number ]}  The tailing and leading index adjustments.
 */
function adjustWhitespace (string1: string, string2: string): [ number, number ] {
  const string1Trimmed = string1.trimEnd()
  const tailingWhitespace = string1.length - string1Trimmed.length

  const string2Trimmed = string2.trimStart()
  const leadingWhitespace = string2.length - string2Trimmed.length

  // Eventually, this may need to be expanded to handle other
  // spacing constraints if they may arise. Currently, this
  // will only handle cases where there is an equal amount of non-zero
  // whitespace between the strings.
  if (tailingWhitespace === 0 || leadingWhitespace === 0 || tailingWhitespace !== leadingWhitespace) {
    return [ 0, 0 ]
  }
  // In case of an odd number of spaces, we bias towards the first string
  //
  // The end index of the first string:
  const string1Padding = string1Trimmed.length + Math.ceil(tailingWhitespace / 2)
  // The start index of the second string:
  const string2Padding = leadingWhitespace - Math.floor(leadingWhitespace / 2)

  return [ string1.length - string1Padding, string2Padding ]
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
  const textNodes = extractTextnodes(ast)

  // To avoid too high loads, we sanitize the document
  // according to the LanguageTool API `data` parameter.
  // By doing so, we only generate errors for TextNode regions
  // https://languagetool.org/http-api/swagger-ui/#!/default/post_check
  const annotations: AnnotationData = { annotation: [] }

  let idx = 0
  let prevNode

  for (const node of textNodes) {
    const markup: Annotation = {}
    const text: Annotation = {}

    let from = node.from - node.whitespaceBefore.length
    let to = node.to

    // This function is meant to handle one following edge case with inline code.
    // When we parse a string with inline code, we get the following structure:
    //
    // String: 'sample text with `inline` formatting.'
    // Parse: [
    //   { text: 'sample text with ' },
    //   { markup: '`inline`' },
    //   { text: ' formatting.'},
    // ]
    //
    // And LT processes the strings as `sample text with[..]formatting.`,
    // which duplicates the spacing. We need to detect instances where
    // two text nodes have equal spacing between them, and adjust the spacing
    // accordingly. We can ignore instances where only one side has spacing,
    // or with mismatched spacing, assuming that spacing should be balanced.
    //
    // When the spacing is equal between the strings, we drop half of the spacing
    // then distribute the remaining spaces across the strings so that any detected
    // spacing errors have a wider context.
    const prevText: string = prevNode?.text ?? ''

    const [ tailing, leading ] = adjustWhitespace(prevText, view.state.sliceDoc(from, to))
    idx -= tailing
    from += leading

    if (prevNode !== undefined) {
      prevNode.text = prevText.slice(0, prevText.length - tailing)
    }

    if (from - idx > 0) {
      markup.markup = view.state.sliceDoc(idx, from)
      if (markup.markup.trim() === '') {
        from = idx
      } else {
        // Sometimes markup includes newlines,
        // so to interpret the spacing correctly,
        // we need to tell LT that this markup should be
        // seen as at least one newline.
        if (markup.markup.indexOf('\n') !== -1) {
          markup.interpretAs = '\n'
        }
        annotations.annotation.push(markup)
      }
    }

    text.text = view.state.sliceDoc(from, to)
    annotations.annotation.push(text)

    prevNode = text
    idx = to
  }
  // Note: Since the iteration ends on a text node, any markup
  // at the end of the document will be excluded from what is
  // sent to the LT API server. This can potentially reduce the
  // amount of data sent.

  const response: [LanguageToolAPIResponse, string[]]|undefined|string = await ipcRenderer.invoke('application', {
    command: 'run-language-tool',
    payload: {
      data: annotations,
      language: view.state.field(languageToolState).overrideLanguage
    }
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
    const word = view.state.sliceDoc(match.offset, match.offset + match.length)
    const issueType = match.rule.issueType
    // skip matches for words in the local dictionary
    if (issueType === 'misspelling' && userDictionary.has(word)) { continue }

    const source = `language-tool(${match.rule.issueType})`
    const severity = (issueType === 'style')
      ? 'info'
      : (issueType === 'misspelling') ? 'error' : 'warning'

    const dia: Diagnostic = {
      from: match.offset,
      to: match.offset + match.length,
      message: match.message,
      severity,
      source
    }

    if (match.replacements.length > 0) {
      const actions: Action[] = []

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

      dia.actions = actions
    }
    diagnostics.push(dia)
  }

  return diagnostics
}, { delay: 2000 }) // Increase the delay to reduce server strain

export const languageTool = [
  ltLinter,
  languageToolState
]
