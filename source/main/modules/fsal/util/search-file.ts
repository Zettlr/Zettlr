/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        searchFile function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Searches through a file's content. This function has been
 *                  separated from the rest of the FSAL due to maintainability.
 *                  Searching is a highly delicated process, and is very likely
 *                  going to get more sophisticated over time, so having the
 *                  function in its own dedicated file makes sure we can
 *                  thoroughly test it.
 *
 * END HEADER
 */

import { MDFileDescriptor, CodeFileDescriptor } from '../types'

interface SearchOperator {
  operator: 'AND'|'NOT'
  word: string
}

interface SearchOrOperator {
  operator: 'OR'
  word: string[]
}

export default function searchFile (
  fileObject: MDFileDescriptor|CodeFileDescriptor,
  terms: Array<SearchOperator|SearchOrOperator>,
  cnt: string
): any[] {
  let matches = 0
  let cntLower = cnt.toLowerCase()

  // Immediately search for not operators
  let notOperators = terms.filter(elem => elem.operator === 'NOT') as SearchOperator[]
  if (notOperators.length > 0) {
    for (let not of notOperators) {
      // NOT is a strict stop indicator, meaning that if
      // one NOT is found in the file, the whole file is
      // disqualified as a candidate.
      if (
        cntLower.includes(not.word.toLowerCase()) ||
        fileObject.name.toLowerCase().includes(not.word.toLowerCase())
      ) {
        return []
      }
    }
  }

  // If we've reached this point, there was no stop. However,
  // it might be, that there are no other terms left, that is:
  // the user wanted to simply *exclude* files. What do we do?
  // Easy, look above: We'll be returning an object to indicate
  // *as if* this file had a filename match.
  if (notOperators.length === terms.length) {
    return [{ line: -1, restext: fileObject.name, 'weight': 2 }]
  }

  // Now, pluck the not operators from the terms
  let termsToSearch = terms.filter(elem => elem.operator !== 'NOT')

  // First try to match the title and tags
  for (let t of termsToSearch) {
    if (t.operator === 'AND') {
      if (fileObject.name.toLowerCase().includes(t.word.toLowerCase()) || fileObject.tags.includes(t.word.toLowerCase())) {
        matches++
      } else if (t.word[0] === '#' && fileObject.tags.includes(t.word.substr(1))) {
        // Account for a potential # in front of the tag
        matches++
      }
    } else if (t.operator === 'OR') {
      // OR operator
      for (let wd of t.word) {
        if (fileObject.name.toLowerCase().includes(wd.toLowerCase()) || fileObject.tags.includes(wd.toLowerCase())) {
          matches++
          // Break because only one match necessary
          break
        } else if (wd[0] === '#' && fileObject.tags.includes(wd.toLowerCase().substr(1))) {
          // Account for a potential # in front of the tag
          matches++
          break
        }
      }
    }
  }

  // Return immediately with an object of line -1 (indicating filename or tag matches) and a huge weight
  if (matches === termsToSearch.length) {
    return [{ line: -1, restext: fileObject.name, 'weight': 2 }]
  }

  // Now begin to search
  const fileMatches = []

  // Initialise the rest of the necessary variables
  let lines = cnt.split('\n')
  let linesLower = cntLower.split('\n')
  let termsMatched = 0

  for (let t of termsToSearch) {
    let hasTermMatched = false
    if (t.operator === 'AND') {
      for (let index = 0; index < lines.length; index++) {
        // Try both normal and lowercase
        if (lines[index].includes(t.word)) {
          fileMatches.push({
            'term': t.word,
            'from': { 'line': index, 'ch': lines[index].indexOf(t.word) },
            'to': { 'line': index, 'ch': lines[index].indexOf(t.word) + t.word.length },
            'weight': 1 // Weight indicates that this was an exact match
          })
          hasTermMatched = true
        } else if (linesLower[index].includes(t.word.toLowerCase())) {
          fileMatches.push({
            'term': t.word,
            'from': { 'line': index, 'ch': linesLower[index].indexOf(t.word.toLowerCase()) },
            'to': { 'line': index, 'ch': linesLower[index].indexOf(t.word.toLowerCase()) + t.word.length },
            'weight': 0.5 // Weight indicates that this was an approximate match
          })
          hasTermMatched = true
        }
      }
      // End AND operator
    } else if (t.operator === 'OR') {
      // OR operator.
      for (let wd of t.word) {
        let br = false
        for (let index = 0; index < lines.length; index++) {
          // Try both normal and lowercase
          if (lines[index].includes(wd)) {
            fileMatches.push({
              'term': wd,
              'from': { 'line': index, 'ch': lines[index].indexOf(wd) },
              'to': { 'line': index, 'ch': lines[index].indexOf(wd) + wd.length },
              'weight': 1 // Weight indicates that this was an exact match
            })
            hasTermMatched = true
            br = true
          } else if (linesLower[index].includes(wd.toLowerCase())) {
            fileMatches.push({
              'term': wd,
              'from': { 'line': index, 'ch': linesLower[index].indexOf(wd.toLowerCase()) },
              'to': { 'line': index, 'ch': linesLower[index].indexOf(wd.toLowerCase()) + wd.length },
              'weight': 1 // Weight indicates that this was an exact match
            })
            hasTermMatched = true
            br = true
          }
        }
        if (br) break
      }
    } // End OR operator
    if (hasTermMatched) termsMatched++
  }

  if (termsMatched === termsToSearch.length) {
    return fileMatches
  } else {
    // Empty array indicating that not all required terms have matched
    return []
  }
}
