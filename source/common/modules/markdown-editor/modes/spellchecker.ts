/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CodeMirror spellchecker mode
 * CVM-Role:        CodeMirror Mode
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A mode that acts as an overlay, providing spell checking.
 *
 * END HEADER
 */

import { defineMode, getMode, overlayMode, Mode } from 'codemirror'
import { getCodeRE, getFootnoteRefRE, getZknTagRE } from '@common/regular-expressions'
const ipcRenderer = window.ipc

// Below's monstrosity is taken from https://stackoverflow.com/a/43243160
const emojiRegex = /(?:[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614-\u2615\u2618\u261D\u2620\u2622-\u2623\u2626\u262A\u262E-\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665-\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B-\u269C\u26A0-\u26A1\u26AA-\u26AB\u26B0-\u26B1\u26BD-\u26BE\u26C4-\u26C5\u26C8\u26CE-\u26CF\u26D1\u26D3-\u26D4\u26E9-\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733-\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763-\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934-\u2935\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|(?:\uD83C[\uDC04\uDCCF\uDD70-\uDD71\uDD7E-\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01-\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50-\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96-\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F-\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95-\uDD96\uDDA4-\uDDA5\uDDA8\uDDB1-\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB-\uDEEC\uDEF0\uDEF3-\uDEF6]|\uD83E[\uDD10-\uDD1E\uDD20-\uDD27\uDD30\uDD33-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4B\uDD50-\uDD5E\uDD80-\uDD91\uDDC0]))/

const codeRE = getCodeRE()
const zknTagRE = getZknTagRE()
const footnoteRefRE = getFootnoteRefRE()
// NOTE: The whitespace after ~ are first a normal space, then an NBSP
const delim = '¡!#$%&()*+,-./:;<=>¿?@[\\]^_`{|}~  «„「『』"“”–—…÷'
// The following list should contain each and every quotation character
const allQuotes = '‘’‚ ›‹«»„“”「」『』"\''

// The cache is a simple hashmap
let spellcheckCache = Object.create(null)

// Listen for dictionary-provider messages
ipcRenderer.on('dictionary-provider', (event, message) => {
  const { command } = message

  if (command === 'invalidate-dict') {
    // Invalidate the buffered dictionary
    spellcheckCache = Object.create(null)
  }
})

let autoCorrectValues = Object.create(null)

/**
 * Refreshes the autocorrect value object with the current state of the config
 */
function refreshAutocorrectValues (replacementTable: Array<{ key: string, value: string }>): void {
  autoCorrectValues = Object.create(null)
  const values = replacementTable.map(elem => elem.value)
  for (const value of values) {
    autoCorrectValues[value] = true
  }
}

/**
 * Checks whether a term is spelled correctly, or not
 *
 * @param   {string}  term  The word to check
 *
 * @return  {boolean}       True, if the word is considered correct.
 */
function check (term: string): boolean {
  // Convert smart quotes into the default before checking the term, see #1948
  const saneTerm = term.replace(/’‘‚‹›»“”」/g, "'")

  // Don't check the empty string, which can arise when
  // a 'word' consists of just opening/closing quotes,
  // which is then removed
  if (term === '') {
    return true
  }

  // Return cache if possible
  if (saneTerm in spellcheckCache) {
    return spellcheckCache[saneTerm]
  }

  // Autocorrect values are also always correct
  if (saneTerm in autoCorrectValues) {
    return true
  }

  // Save into the corresponding cache and return the query result
  // Return the query result
  const correct = ipcRenderer.sendSync('dictionary-provider', {
    command: 'check',
    term: saneTerm
  })

  if (correct === undefined) {
    // Don't check unless its ready
    return true
  }

  // Cache the result
  spellcheckCache[saneTerm] = correct
  return correct
}

/**
  * Define the spellchecker mode that will simply check all found words against
  * the renderer's typoCheck function.
  * @param  {Object} config    The original mode config
  * @param  {Object} parsercfg The parser config
  * @return {OverlayMode}           The generated overlay mode
  */
defineMode('spellchecker', function (config, parsercfg) {
  // We need the replacementTable. The modes will be re-instantiated as soon
  // as some options in config change, so we can rest assured that we have
  // the replacements available. However, shortly after opening the main window
  // the property will not be set, so we have to check that we're getting an
  // array. If we are, we can set the autocorrect values.
  const replacementTable = (config as any).autoCorrect?.replacements
  if (Array.isArray(replacementTable)) {
    refreshAutocorrectValues(replacementTable)
  }

  // Create the overlay and such
  const spellchecker: Mode<{}> = {
    token: function (stream) {
      // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
      const ls: string = (config as any).zettlr.zettelkasten.linkStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
      const le: string = (config as any).zettlr.zettelkasten.linkEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input

      const zknLinkRE = new RegExp(ls + '.+?' + le)

      // Exclude zkn-links (because otherwise CodeMirror will create
      // multiple HTML elements _inside_ the link block, which will
      // render it way more difficult to extract the search terms.)
      if ((ls !== '') && stream.match(zknLinkRE) !== null) {
        // Don't check on links if this is impossible
        return null
      }

      // Don't spellcheck tags
      if (stream.match(zknTagRE) !== null) {
        return null
      }

      // Don't spellcheck inline code
      if (stream.match(codeRE) !== null) {
        return null
      }

      // Don't spellcheck footnote references
      // to enable users to use named references
      // without breaking the preview.
      if (stream.match(footnoteRefRE) !== null) {
        return null
      }

      let ch = stream.peek()
      if (ch === null) {
        return null
      }

      let word = ''

      if (delim.includes(ch)) {
        stream.next()
        return null
      }

      while ((ch = stream.peek()) != null && !delim.includes(ch)) {
        word += ch
        stream.next()
      }

      // Exclude numbers (even inside words) from spell checking
      // // Regex for whole numbers would be /^\d+$/
      if (/\d+/.test(word)) {
        return null
      }

      // Also, exclude Emojis. This will possibly not match all, but we're
      // talking about text documents, not instant messages.
      if (emojiRegex.test(word)) {
        return null
      }

      // Exclude links from spell checking as well
      if (/https?|www\./.test(word)) {
        // Let's eat the stream until the end of the link
        while ((stream.peek() != null) && (stream.peek() !== ' ')) {
          stream.next()
        }
        return null
      }

      // Prevent returning false results because of 'quoted' words.
      while (allQuotes.includes(word[0])) {
        word = word.substring(1)
      }
      while (allQuotes.includes(word[word.length - 1])) {
        word = word.substring(0, word.length - 1)
      }

      if (!check(word)) {
        return 'spell-error' // CSS class: cm-spell-error
      }

      return null
    }
  }

  const mode = getMode(config, {
    name: 'markdown-zkn',
    highlightFormatting: true
  })
  return overlayMode(mode, spellchecker, true)
})
