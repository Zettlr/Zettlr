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

import { linter, type Diagnostic } from '@codemirror/lint'
import { extractTextnodes, markdownToAST } from '@common/modules/markdown-utils'
import { configField } from '../util/configuration'
import { trans } from '@common/i18n-renderer'

const ipcRenderer = window.ipc

// Below's monstrosity is taken from https://stackoverflow.com/a/43243160
// const emojiRegex = /(?:[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614-\u2615\u2618\u261D\u2620\u2622-\u2623\u2626\u262A\u262E-\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665-\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B-\u269C\u26A0-\u26A1\u26AA-\u26AB\u26B0-\u26B1\u26BD-\u26BE\u26C4-\u26C5\u26C8\u26CE-\u26CF\u26D1\u26D3-\u26D4\u26E9-\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733-\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763-\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934-\u2935\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|(?:\uD83C[\uDC04\uDCCF\uDD70-\uDD71\uDD7E-\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01-\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50-\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96-\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F-\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95-\uDD96\uDDA4-\uDDA5\uDDA8\uDDB1-\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB-\uDEEC\uDEF0\uDEF3-\uDEF6]|\uD83E[\uDD10-\uDD1E\uDD20-\uDD27\uDD30\uDD33-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4B\uDD50-\uDD5E\uDD80-\uDD91\uDDC0]))/
// The L matches any letter from any alphabet, including chinese, Japanese,
// Russian, etc. Additionally, we have quote characters so that "don't" (with
// typographically correct quotes) is also recognized.
const anyLetterRE = /[\p{L}'’‘]+/gu
const noneLetterRE = /^['’‘]+$/
const nonLetters = '\'’‘'

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

  return {
    from: nodeStart + index,
    to: nodeStart + index + word.length,
    message: trans('Spelling mistake'),
    severity: 'error',
    source: 'spellcheck' // Useful for later filtering of all diagnostics present
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

  const wordsToCheck: Array<{ word: string, index: number, nodeStart: number }> = textNodes
    // First, extract all words from the node's value
    .flatMap(node => {
      const words: Array<{ index: number, word: string }> = []
      for (const match of node.value.matchAll(anyLetterRE)) {
        // Remove words that only consists, e.g., of quotes
        if (!noneLetterRE.test(match[0])) {
          // Remove none-letters from the beginnings and ends of words
          let word = match[0]
          while (nonLetters.includes(word[0])) {
            word = word.slice(1)
          }
          while (nonLetters.includes(word[word.length - 1])) {
            word = word.slice(0, word.length - 1)
          }
          words.push({ word, index: match.index })
        }
      }

      return words.map(x => ({ ...x, nodeStart: node.from }))
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
