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

import { linter, Diagnostic, Action } from '@codemirror/lint'
import { trans } from '@common/i18n-renderer'
import { Parent, Text } from 'mdast' // NOTE: Dependency of remark, not in package.json
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { getZknTagRE } from '@common/regular-expressions'
import { md2ast } from '@common/util/md-to-ast'
import { AnyMenuItem } from '@dts/renderer/context'
import { configField } from '../util/configuration'

const ipcRenderer = window.ipc

// Below's monstrosity is taken from https://stackoverflow.com/a/43243160
const emojiRegex = /(?:[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614-\u2615\u2618\u261D\u2620\u2622-\u2623\u2626\u262A\u262E-\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665-\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B-\u269C\u26A0-\u26A1\u26AA-\u26AB\u26B0-\u26B1\u26BD-\u26BE\u26C4-\u26C5\u26C8\u26CE-\u26CF\u26D1\u26D3-\u26D4\u26E9-\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733-\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763-\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934-\u2935\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|(?:\uD83C[\uDC04\uDCCF\uDD70-\uDD71\uDD7E-\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01-\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50-\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96-\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F-\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95-\uDD96\uDDA4-\uDDA5\uDDA8\uDDB1-\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB-\uDEEC\uDEF0\uDEF3-\uDEF6]|\uD83E[\uDD10-\uDD1E\uDD20-\uDD27\uDD30\uDD33-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4B\uDD50-\uDD5E\uDD80-\uDD91\uDDC0]))/

const zknTagRE = getZknTagRE()

// The cache is a simple hashmap. NOTE: This is shared across all spellcheckers,
// which reduces the memory footprint but prevents differences in spellchecker
// configuration across the window. So if we want to allow that at some point,
// we'll have to move that whole file into a function scope.
const spellcheckCache = new Map<string, boolean>()
const suggestionCache = new Map<string, string[]>()

// Listen for dictionary-provider messages
ipcRenderer.on('dictionary-provider', (event, message) => {
  const { command } = message

  if (command === 'invalidate-dict') {
    // Invalidate the buffered dictionary
    spellcheckCache.clear()
    suggestionCache.clear()
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

  const from = nodeStart + index
  const to = from + word.length

  const dia: Diagnostic = {
    from,
    to,
    message: 'Spelling mistake', // TODO: Translate
    severity: 'error',
    source: 'spellcheck' // Useful for later filtering of all diagnostics present
  }

  const actions: Action[] = [
    {
      name: 'Options', // TODO: Translate!
      apply (view, from, to) {
        fetchSuggestions(word)
          .then(suggestions => {
            const coords = { x: 0, y: 0 }
            const rect = view.coordsAtPos(from)
            if (rect !== null) {
              coords.x = rect.left
              coords.y = rect.top
            }

            const items: AnyMenuItem[] = suggestions.map(suggestion => {
              return {
                type: 'normal',
                enabled: true,
                label: suggestion,
                id: suggestion
              }
            })

            if (items.length === 0) {
              items.push({
                type: 'normal',
                enabled: false,
                label: trans('menu.no_suggestions'),
                id: 'no-suggestion'
              })
            }

            // Add the add method
            items.unshift(
              {
                label: trans('menu.add_to_dictionary'),
                id: 'add-to-dictionary',
                type: 'normal',
                enabled: true
              },
              { type: 'separator' }
            )

            showPopupMenu(coords, items, clickedID => {
              if (clickedID === 'no-suggestion') {
                // Do nothing
              } else if (clickedID === 'add-to-dictionary') {
                ipcRenderer.invoke(
                  'dictionary-provider',
                  { command: 'add', terms: [word] }
                )
                  .catch(e => console.error(e))
              } else {
                view.dispatch({ changes: { from, to, insert: clickedID } })
              }
            })
          })
          .catch(e => console.error(e))
      }
    }
  ]

  dia.actions = actions

  return dia
}

/**
 * Returns a list of suggestions. If none are cached locally, this will return
 * an empty list and start a fetch in the background.
 *
 * @param   {string}             term  The term to get suggestions for
 *
 * @return  {Promise<string[]>}        A list of possible suggestions
 */
async function fetchSuggestions (term: string): Promise<string[]> {
  const saneTerm = sanitizeTerm(term)
  const cachedSuggestions = suggestionCache.get(saneTerm)
  if (cachedSuggestions !== undefined) {
    return cachedSuggestions
  }

  // If we're here, the suggestion has not yet been cached. Code is equal to
  // above's batchSuggest
  const suggestions: string[][] = await ipcRenderer.invoke(
    'dictionary-provider',
    { command: 'suggest', terms: [saneTerm] }
  )

  suggestionCache.set(saneTerm, suggestions[0])
  return suggestions[0]
}

/**
 * Returns just the text nodes from a string of Markdown, using mdast
 *
 * @param   {string|Parent}  input  Either Markdown string or an AST element (only)
 *
 * @return  {Text[]}            A set of text nodes (including their positions)
 */
function extractTextnodes (input: string|Parent): Text[] {
  const ast = (typeof input === 'string') ? md2ast(input) : input
  const textNodes: Text[] = []
  // NOTE: We're dealing with an mdast, not the CodeMirror Markdown mode one!
  const ignoreBlocks = [ 'code', 'math' ]

  for (const child of ast.children) {
    if (ignoreBlocks.includes(child.type)) {
      continue // Ignore non-text blocks
    }

    if ('children' in child && Array.isArray(child.children)) {
      textNodes.push(...extractTextnodes(child)) // Text nodes cannot have children
    } else if (child.type === 'text') {
      // Only spit out text nodes
      textNodes.push(child)
    }
  }

  return textNodes
}

/**
 * Defines a spellchecker that runs over the text content of the document and
 * highlights misspelled words
 */
export const spellcheck = linter(async view => {
  const diagnostics: Diagnostic[] = []
  const autocorrectValues = view.state.field(configField).autocorrect.replacements.map(x => x.value)
  const textNodes = extractTextnodes(view.state.doc.toString())

  // At this point, we've basically already gotten rid of everything inside
  // the document, except Emojis
  textNodes.map(node => {
    node.value = node.value.replace(emojiRegex, '')
    return node
  })

  const wordsToCheck: Array<{ word: string, index: number, nodeStart: number }> = textNodes
  // Remove nodes w/o position (should not happen, but TypeScript complained)
    .filter(node => node.position?.start.offset !== undefined)
    // Then, extract all words from the node's value
    .map(node => {
      const words = node.value.replace(emojiRegex, '').split(/\s+/)
        .filter(w => !zknTagRE.test(w)) // Remove tags
        .map(w => sanitizeTerm(w))
        .map(w => w.replace(/^\W*([\w']+)\W*$/, '$1')) // Strip non-word chars
        .filter(w => w !== '') // Remove empty words
        .filter(w => !/\d/.test(w)) // And those with numbers

      const ret: Array<{ word: string, index: number, nodeStart: number }> = []
      const nodeStart = node.position?.start.offset as number
      let index = 0
      for (const word of words) {
        index = node.value.indexOf(word, index)
        ret.push({ word, index, nodeStart })
        index += word.length
      }

      return ret
    })
    .flat() // We now have a 2d array --> flatten

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
