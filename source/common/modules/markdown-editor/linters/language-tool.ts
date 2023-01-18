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

import { linter, Diagnostic, Action } from '@codemirror/lint'
import { extractTextnodes } from '@common/util/md-to-ast'
import { configField } from '../util/configuration'
import { LanguageToolAPIResponse } from '@providers/commands/language-tool'
import { StateEffect, StateField } from '@codemirror/state'

const ipcRenderer = window.ipc

const toggleLTR = StateEffect.define<boolean>()

export const languageToolRunning = StateField.define<boolean>({
  create: () => false,
  update (value, transaction) {
    for (const e of transaction.effects) {
      if (e.is(toggleLTR)) {
        value = e.value
      }
    }
    return value
  }
})

/**
 * Defines a spellchecker that runs over the text content of the document and
 * highlights misspelled words
 */
const ltLinter = linter(async view => {
  if (!view.state.field(configField).lintLanguageTool) {
    return []
  }

  view.dispatch({ effects: toggleLTR.of(true) })

  const diagnostics: Diagnostic[] = []

  const document = view.state.doc.toString()
  const textNodes = extractTextnodes(document)

  // To avoid too high loads, we have to send a "pseudo-plain text" document.
  // That will generate a few warnings that relate towards the Markdown syntax,
  // but we are clever: Since we can extract the textNodes, we can basically
  // ignore any warning outside of these ranges! YAY!

  const ltSuggestions: LanguageToolAPIResponse|undefined = await ipcRenderer.invoke('application', {
    command: 'run-language-tool',
    payload: document
  })

  view.dispatch({ effects: toggleLTR.of(false) })

  if (ltSuggestions === undefined) {
    return [] // Either an error or something else -- check the logs
  }

  if (ltSuggestions.matches.length === 0) {
    return [] // Hooray, nothing wrong!
  }

  // Now, we have to remove those matches that are outside any textNode in the
  // given document.
  for (let i = 0; i < ltSuggestions.matches.length; i++) {
    const from = ltSuggestions.matches[i].offset
    const to = from + ltSuggestions.matches[i].length
    let isValid = false

    for (const node of textNodes) {
      const nodeStart = node.position?.start.offset as number
      const nodeEnd = nodeStart + node.value.length
      if (from >= nodeStart && to <= nodeEnd) {
        // As soon as we find a textNode that contains the match, we are good.
        isValid = true
        break
      }
    }

    // Node is not valid --> remove
    if (!isValid) {
      ltSuggestions.matches.splice(i, 1)
      i--
    }
  }

  // At this point, we have only valid suggestions that we can now insert into
  // the document.
  for (const match of ltSuggestions.matches) {
    const source = `language-tool(${match.rule.issueType})`
    const severity = (match.rule.issueType === 'style')
      ? 'info'
      : (match.rule.issueType === 'misspelling') ? 'error' : 'warning'

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
})

export const languageTool = [
  ltLinter,
  languageToolRunning
]
