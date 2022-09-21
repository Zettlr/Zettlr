import { syntaxTree } from '@codemirror/language'
import { linter, Diagnostic } from '@codemirror/lint'
import { getZknTagRE } from '@common/regular-expressions'
import { configField } from '../util/configuration'

const ipcRenderer = window.ipc

// Below's monstrosity is taken from https://stackoverflow.com/a/43243160
const emojiRegex = /(?:[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9-\u21AA\u231A-\u231B\u2328\u23CF\u23E9-\u23F3\u23F8-\u23FA\u24C2\u25AA-\u25AB\u25B6\u25C0\u25FB-\u25FE\u2600-\u2604\u260E\u2611\u2614-\u2615\u2618\u261D\u2620\u2622-\u2623\u2626\u262A\u262E-\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u2660\u2663\u2665-\u2666\u2668\u267B\u267F\u2692-\u2697\u2699\u269B-\u269C\u26A0-\u26A1\u26AA-\u26AB\u26B0-\u26B1\u26BD-\u26BE\u26C4-\u26C5\u26C8\u26CE-\u26CF\u26D1\u26D3-\u26D4\u26E9-\u26EA\u26F0-\u26F5\u26F7-\u26FA\u26FD\u2702\u2705\u2708-\u270D\u270F\u2712\u2714\u2716\u271D\u2721\u2728\u2733-\u2734\u2744\u2747\u274C\u274E\u2753-\u2755\u2757\u2763-\u2764\u2795-\u2797\u27A1\u27B0\u27BF\u2934-\u2935\u2B05-\u2B07\u2B1B-\u2B1C\u2B50\u2B55\u3030\u303D\u3297\u3299]|(?:\uD83C[\uDC04\uDCCF\uDD70-\uDD71\uDD7E-\uDD7F\uDD8E\uDD91-\uDD9A\uDDE6-\uDDFF\uDE01-\uDE02\uDE1A\uDE2F\uDE32-\uDE3A\uDE50-\uDE51\uDF00-\uDF21\uDF24-\uDF93\uDF96-\uDF97\uDF99-\uDF9B\uDF9E-\uDFF0\uDFF3-\uDFF5\uDFF7-\uDFFF]|\uD83D[\uDC00-\uDCFD\uDCFF-\uDD3D\uDD49-\uDD4E\uDD50-\uDD67\uDD6F-\uDD70\uDD73-\uDD7A\uDD87\uDD8A-\uDD8D\uDD90\uDD95-\uDD96\uDDA4-\uDDA5\uDDA8\uDDB1-\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA-\uDE4F\uDE80-\uDEC5\uDECB-\uDED2\uDEE0-\uDEE5\uDEE9\uDEEB-\uDEEC\uDEF0\uDEF3-\uDEF6]|\uD83E[\uDD10-\uDD1E\uDD20-\uDD27\uDD30\uDD33-\uDD3A\uDD3C-\uDD3E\uDD40-\uDD45\uDD47-\uDD4B\uDD50-\uDD5E\uDD80-\uDD91\uDDC0]))/

const zknTagRE = getZknTagRE()

// The cache is a simple hashmap
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
 * Checks whether a term is spelled correctly, or not
 *
 * @param   {string}  term  The word to check
 *
 * @return  {boolean}       True, if the word is considered correct.
 */
function check (term: string, autocorrectValues: string[]): boolean {
  // Don't check empty strings, which can arise when a 'word' consists of just
  // opening/closing quotes, which is then removed
  if (term === '') {
    return true
  }

  // Convert smart quotes into the default before checking the term, see #1948
  const saneTerm = term.replace(/’‘‚‹›»“”」/g, "'")

  // Return cache if possible
  const cacheResult = spellcheckCache.get(saneTerm)
  if (cacheResult !== undefined) {
    return cacheResult
  }

  // Autocorrect values are also always correct
  if (autocorrectValues.includes(saneTerm)) {
    return true
  }

  // Save into the corresponding cache and return the query result
  // Return the query result
  const correct: boolean|undefined = ipcRenderer.sendSync('dictionary-provider', {
    command: 'check',
    term: saneTerm
  })

  if (correct === undefined) {
    // Don't check unless its ready
    return true
  }

  // Cache the result
  spellcheckCache.set(saneTerm, correct)
  return correct
}

function suggest (term: string): string[] {
  // TODO: MOVE THIS TO THE MAIN PROCESS!
  const cachedSuggestions = suggestionCache.get(term)
  if (cachedSuggestions !== undefined) {
    return cachedSuggestions
  }

  const suggestions = ipcRenderer.sendSync('dictionary-provider', {
    command: 'suggest', term
  })

  suggestionCache.set(term, suggestions)

  return suggestions
}

export const spellchecker = linter(view => {
  const diagnostics: Diagnostic[] = []

  const autocorrectValues = view.state.field(configField).autocorrect.replacements.map(x => x.value)

  syntaxTree(view.state).cursor().iterate(node => {
    const ignoreNodes = [
      'FencedCode', // Code blocks
      'HTMLTag', // HTML tags
      'URL', // Only URLs (not titles etc.)
      'InlineCode',
      // Various formatting characters
      'TableDelimiter',
      'CodeMark',
      'HeaderMark',
      'EmphasisMark',
      'LinkMark',
      'QuoteMark',
      'ListMark'
    ]

    // Container nodes
    const passOverNodes = [
      'Document',
      'Link',
      'Image',
      'BulletList',
      'OrderedList',
      'Table'
    ]

    if (node.type.name.startsWith('YAML')) {
      return false // Do not check a frontmatter
    }

    if (ignoreNodes.includes(node.type.name)) {
      return false
    }

    if (passOverNodes.includes(node.type.name)) {
      return
    }

    let contents = view.state.sliceDoc(node.from, node.to)

    // Heading nodes will contain their === or --- markers.
    if (node.type.name.startsWith('SetextHeading')) {
      contents = contents.substring(0, contents.lastIndexOf('\n'))
    }

    // Remove tags
    contents = contents.replace(zknTagRE, '')
    // Remove formatting characters
    contents = contents.replace(/^(?:#{1,6}|>)\s/, '')
    contents = contents.replace(/[_*]{1,3}/g, '')
    contents = contents.replace(/`{1,3}.+`{1,3}/g, '')
    // Images and Links
    contents = contents.replace(/!?\[(.+)\]\(.+\)/g, '$1')
    // HTML
    contents = contents.replace(/<.+>/g, '')
    // Emojis
    contents = contents.replace(emojiRegex, '')

    // At this point we should have more or less plain text which we can further
    // treat.
    const words = contents.split(/\s+/)
      .filter(w => w !== '') // Remove empty words
      .filter(w => /^\w+$/.test(w) && !/\d/.test(w)) // And those with numbers

    // Now we have easy word lists. We now need to go over the original contents
    // again, retrieving the indices of the given words and add Diagnostics for
    // those deemed erroneous.
    const nodeContents = view.state.sliceDoc(node.from, node.to)
    let index = 0
    for (const word of words) {
      index = nodeContents.indexOf(word, index)
      if (!check(word, autocorrectValues)) {
        const from = node.from + index
        const to = from + word.length

        const suggestions = suggest(word)

        const dia: Diagnostic = { from, to, severity: 'error', message: 'Suggestions:' }

        if (suggestions.length > 0) {
          dia.actions = [{
            name: suggestions[0],
            apply (view, from, to) {
              view.dispatch({
                changes: { from, to, insert: suggestions[0] }
              })
            }
          }]
        } else {
          dia.message = 'No suggestions'
        }

        diagnostics.push(dia)
      }

      index += word.length
    }
    return false // Do not descend further
  })
  return diagnostics
})
