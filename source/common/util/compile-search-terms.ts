/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function compiles a string of search terms.
 *
 *                  Supported operators:
 *                  * AND (space)
 *                  * OR (pipe, |)
 *                  * NOT (exclamation mark, !)
 *
 * END HEADER
 */

import type { SearchTerm } from '@dts/common/search'

export default function compileSearchTerms (term: string): SearchTerm[] {
  // First sanitize the terms
  const myTerms: SearchTerm[] = []
  let curWord = ''
  let hasExact = false
  let operator: 'AND'|'OR'|'NOT' = 'AND'

  for (let i = 0; i < term.length; i++) {
    const c = term.charAt(i)
    if (c === ' ' && !hasExact) {
      // Spaces mark the end of one search term (except we're in an exact match)
      if (curWord.trim() !== '') {
        myTerms.push({ words: [curWord.trim()], operator })
        curWord = ''
        operator = 'AND' // Reset the operator
      }
      continue
    } else if (c === '|') {
      // We got an OR operator
      // If the next character is a space, we can use a shortcut here
      if (term.charAt(i + 1) === ' ') {
        ++i
      }

      // We know additionally know that the previous operator was an or. But
      // let's check that the user hasn't accidentally deleted one OR-word and
      // now their current search STARTS with a pipe character. If not, we will
      // disregard this OR character and treat what's coming as an AND
      if (myTerms.length > 0) {
        myTerms[myTerms.length - 1].operator = 'OR'
        operator = 'OR'
      }
      continue
    } else if (c === '"') {
      if (!hasExact) {
        // Begin an exact phrase
        hasExact = true
      } else {
        hasExact = false
        // Do not trim the word to account for trailing and
        // ending whitespace within an exact capturing group
        myTerms.push({ words: [curWord], operator })
        curWord = ''
        operator = 'AND'
      }
      continue
    } else if (c === '!' && !hasExact && curWord === '') {
      // An exclamation mark only has meaning if it is preceeded
      // by a space and not within an exact match. Preceeded by
      // space is indicated by an empty curWord variable.
      operator = 'NOT'
      continue // We don't want the ! in the term
    }

    curWord += term.charAt(i)
  }

  // Now that we're through the search terms, clean up

  // If there is a last word (in most cases it should be), add it to the list
  if (curWord.trim() !== '') {
    myTerms.push({ words: [curWord.trim()], operator })
  }

  // Now pack together all consecutive ORs
  // to make it easier for the search in the main process
  let currentOr: SearchTerm = {
    operator: 'OR',
    words: []
  }

  const newTerms: SearchTerm[] = []

  for (let i = 0; i < myTerms.length; i++) {
    if (myTerms[i].operator !== 'OR') {
      if (currentOr.words.length > 0) {
        // Duplicate object so that the words are retained
        newTerms.push(currentOr)
        currentOr = { operator: 'OR', words: [] }
      }
      newTerms.push(myTerms[i])
    } else {
      currentOr.words = currentOr.words.concat(myTerms[i].words)
    }
  }

  // Now push the currentOr if not empty
  if (currentOr.words.length > 0) {
    newTerms.push(currentOr)
  }

  return newTerms
}
