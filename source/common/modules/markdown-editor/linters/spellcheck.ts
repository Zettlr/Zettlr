/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Spellchecker
 * CVM-Role:        Linter
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This linter function checks Markdown documents for spelling
 *                  mistakes.
 *
 * END HEADER
 */

import { linter, type Diagnostic, type Action } from '@codemirror/lint'
import { extractTextnodes, markdownToAST } from '@common/modules/markdown-utils'
import { configField } from '../util/configuration'
import { trans } from '@common/i18n-renderer'

const ipcRenderer = window.ipc

// The cache is a simple hashmap. NOTE: This is shared across all spellcheckers,
// which reduces the memory footprint but prevents differences in spellchecker
// configuration across the window. So if we want to allow that at some point,
// we'll have to move that whole file into a function scope.
const spellcheckCache = new Map<string, boolean>()

// Listen for dictionary-provider messages
ipcRenderer.on('dictionary-provider', (event, message) => {
  const { command } = message

  if (command === 'invalidate-dict') {
    // Invalidate the buffered dictionary
    spellcheckCache.clear()
  }
})

/**
 * Sanitizes a term so that the dictionary can find it (remove funky characters
 * and quotes, for example)
 *
 * @param   {string}  term  The unsanitized term
 *
 * @return  {string}        The sanitized term
 */
function sanitizeTerm (term: string): string {
  // Convert smart quotes into the default before checking the term, see #1948
  return term.replace(/’‘‚‹›»“”」/g, "'")
}

/**
 * Use this function to check & cache a whole batch of words which reduces the
 * overall overhead from having to check hundreds of words with a single IPC
 * call each. We use a dedicated function for this as most of the time we only
 * need to check a single word. This here is only really necessary after booting
 * the window to (re)fill the spellcheck cache.
 *
 * @param  {string[]}  terms  The words to check
 */
async function batchCheck (terms: string[]): Promise<void> {
  terms = terms.map(term => sanitizeTerm(term))

  // Don't double check terms that are already cached
  terms = terms.filter(t => !spellcheckCache.has(t))

  if (terms.length === 0) {
    return
  }

  const correct: boolean[]|undefined = await ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'check', terms }
  )

  if (correct === undefined) {
    console.warn(`Could not spellcheck terms ${terms.join(', ')}: Main returned undefined`)
    return
  }

  for (let i = 0; i < terms.length; i++) {
    spellcheckCache.set(terms[i], correct[i])
  }
}

/**
 * Checks whether a term is spelled correctly, or not
 *
 * @param   {string}  term  The word to check
 *
 * @return  {boolean}       True, if the word is considered correct.
 */
async function check (term: string, autocorrectValues: string[]): Promise<boolean> {
  const saneTerm = sanitizeTerm(term)

  // Autocorrect values are always correct
  if (autocorrectValues.includes(saneTerm)) {
    return true
  }

  // Next chance: Return the cache
  const cacheResult = spellcheckCache.get(saneTerm)
  if (cacheResult !== undefined) {
    return cacheResult
  }

  // The following code is equal to batchCheck().
  const correct: boolean[]|undefined = await ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'check', terms: [saneTerm] }
  )

  if (correct === undefined) {
    return true
  }

  spellcheckCache.set(saneTerm, correct[0])
  return correct[0]
}

/**
 * (Asynchronously) checks one word
 *
 * @param   {string}    word                 The word to check
 * @param   {number}    index                Its relative index to nodeStart
 * @param   {number}    nodeStart            The node's start index
 * @param   {string[]}  autocorrectValues    Possible autocorrect values
 *
 * @return  {Promise<Diagnostic|undefined>}  Returns undefined if the word was fine, otherwise a Diagnostic object
 */
async function checkWord (word: string, index: number, nodeStart: number, autocorrectValues: string[]): Promise<Diagnostic|undefined> {
  if (await check(word, autocorrectValues)) {
    return undefined
  }

  const saneTerm = sanitizeTerm(word)

  const suggestions = await ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'suggest', terms: [saneTerm], limit: 3 }
  )

  const actions: Action[] = []
  for (const value of suggestions[0]) {
    actions.push({
      name: value,
      apply (view, from, to) {
        view.dispatch({ changes: { from, to, insert: value } })
      }
    })
  }

  return {
    from: nodeStart + index,
    to: nodeStart + index + word.length,
    message: trans('Spelling mistake'),
    severity: 'error',
    source: 'spellcheck', // Useful for later filtering of all diagnostics present
    actions: actions
  }
}

/**
 * Defines a spellchecker that runs over the text content of the document and
 * highlights misspelled words
 */
export const spellcheck = linter(async view => {
  const diagnostics: Diagnostic[] = []
  const autocorrectValues = view.state.field(configField).autocorrect.replacements.map(x => x.value)
  const ast = markdownToAST(view.state.doc.toString())
  const textNodes = extractTextnodes(ast)

  const locale: string = window.config.get('appLang')
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })

  const wordsToCheck: { word: string, index: number, nodeStart: number }[] = textNodes
    // First, extract all words from the node's value
    .flatMap(node => {
      const words: { index: number, word: string, nodeStart: number }[] = []

      for (const { segment, index, isWordLike } of segmenter.segment(node.value)) {
        if (isWordLike === true) {
          words.push({ word: segment, index: index, nodeStart: node.from })
        }
      }

      return words
    })

  // Now make sure everything is cached beforehand with two IPC calls
  await batchCheck(wordsToCheck.map(x => x.word))

  for (const { word, index, nodeStart } of wordsToCheck) {
    const diagnostic = await checkWord(word, index, nodeStart, autocorrectValues)
    if (diagnostic !== undefined) {
      diagnostics.push(diagnostic)
    }
  }

  return diagnostics
})
