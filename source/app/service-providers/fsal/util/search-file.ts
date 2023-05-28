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

import type { SearchResult, SearchTerm } from '@dts/common/search'
import type { MDFileDescriptor, CodeFileDescriptor } from '@dts/common/fsal'

/**
 * Performs a full text search on the given fileObject, using terms. Returns a
 * result set, which, if empty, indicates that the file did not match all
 * required terms and should thus not be considered a match.
 *
 * @return  {SearchResult[]}  The result set
 */
export default function searchFile (fileObject: MDFileDescriptor|CodeFileDescriptor, terms: SearchTerm[], cnt: string): SearchResult[] {
  let termsMatched = 0
  let cntLower = cnt.toLowerCase()
  const finalResults: SearchResult[] = []

  // First, divide the terms in NOT operators and the rest
  const notOperators = terms.filter(elem => elem.operator === 'NOT')
  const termsToSearch = terms.filter(elem => elem.operator !== 'NOT')

  // Then, create an array of all NOT words
  const notWords: string[] = notOperators.reduce((acc: string[], curr) => {
    return acc.concat(curr.words.map(w => w.toLowerCase()))
  }, [])

  for (const term of notWords) {
    // NOT is a strict stop indicator, meaning that if one NOT is found in the
    // file, the whole file is disqualified as a candidate.
    if (cntLower.includes(term) || fileObject.name.toLowerCase().includes(term)) {
      return []
    }
  }

  // If we've reached this point, there was no stop. However, it might be, that
  // there are no other terms left, that is: the user wanted to simply *exclude*
  // files. What do we do? Easy, look above: We'll be returning an object to
  // indicate *as if* this file had a filename match.
  if (notOperators.length === terms.length) {
    return [{
      line: -1,
      ranges: [{ from: 0, to: fileObject.name.length }],
      restext: fileObject.name,
      weight: 2
    }]
  }

  // First try to match the title and tags
  for (const t of termsToSearch) {
    const matchedWords = new Set<string>()
    for (const wd of t.words) {
      if (fileObject.name.toLowerCase().includes(wd.toLowerCase()) || (fileObject.type === 'file' && fileObject.tags.includes(wd.toLowerCase()))) {
        matchedWords.add(wd)
        if (t.operator === 'OR') {
          // Break because only one match necessary
          break
        }
      } else if (wd[0] === '#' && fileObject.type === 'file' && fileObject.tags.includes(wd.toLowerCase().substring(1))) {
        // Account for a potential # in front of the tag
        matchedWords.add(wd)
        if (t.operator === 'OR') {
          // Break because only one match necessary
          break
        }
      }
    }

    // Now check if we have a go. We are accounting for any word that got any
    // match. This means, for an OR matchedWords must contain at least one word,
    // whereas for an AND, matchedWords must be the same size as t.words.
    if (t.operator === 'OR' && matchedWords.size > 0) {
      termsMatched++
    } else if (matchedWords.size === t.words.length) {
      termsMatched++
    }
  }

  // In case the title and/or tags matched, push an object of line -1 (indicating
  // filename or tag matches) and a huge weight first
  if (termsMatched === termsToSearch.length) {
    finalResults.push(
      {
        line: -1,
        ranges: [{ from: 0, to: fileObject.name.length }],
        restext: fileObject.name,
        weight: 2
      }
    )
  }

  // Now begin to search the full text
  const fileMatches: SearchResult[] = []
  const resultLines = new Set<number>() // Necessary for combining results later

  // Initialise the rest of the necessary variables
  const lines = cnt.split('\n')
  const linesLower = cntLower.split('\n')
  termsMatched = 0 // Reset since we're doing the same search a second time

  for (const t of termsToSearch) {
    const matchedWords = new Set<string>()
    for (const wd of t.words) {
      for (let index = 0; index < lines.length; index++) {
        // Try both normal and lowercase
        if (lines[index].includes(wd)) {
          fileMatches.push({
            line: index,
            restext: lines[index],
            ranges: [{
              from: lines[index].indexOf(wd),
              to: lines[index].indexOf(wd) + wd.length
            }],
            weight: 1 // Weight indicates that this was an exact match
          })
          matchedWords.add(wd)
          resultLines.add(index)
          if (t.operator === 'OR') {
            break
          }
        } else if (linesLower[index].includes(wd.toLowerCase())) {
          fileMatches.push({
            line: index,
            restext: lines[index],
            ranges: [{
              from: linesLower[index].indexOf(wd.toLowerCase()),
              to: linesLower[index].indexOf(wd.toLowerCase()) + wd.length
            }],
            weight: 1 // Weight indicates that this was an exact match
          })
          matchedWords.add(wd)
          resultLines.add(index)
          if (t.operator === 'OR') {
            break
          }
        }
      }

      if (t.operator === 'OR' && matchedWords.size > 0) {
        break
      }
    }

    if (t.operator === 'OR' && matchedWords.size > 0) {
      termsMatched++
    } else if (matchedWords.size === t.words.length) {
      termsMatched++
    }
  }

  // Now immediately check if all required terms have matched. If not, we can
  // disregard this file now and save some computing time below.
  if (termsMatched !== termsToSearch.length) {
    // Make sure we return the finalResults array instead of an empty array, so
    // we don't lose the file in case only its title has matched.
    return finalResults
  }

  // Post-process the search result. Right now, a lot of stuff is unsorted since
  // the whole document is first searched for the first AND-term, then the
  // second, etc. We're doing this here in the node main process, and not in the
  // renderer to save a few milliseconds of time (because no rendering actions
  // are being performed here in between).

  // First, sort all search results with regard to the lines in which they occur
  fileMatches.sort((resultA, resultB) => resultA.line - resultB.line)

  // Second, we can also combine results from the same line!
  for (const line of [...resultLines].sort((a, b) => a - b)) {
    // Here we're making use of some fancy MapReduce logic to create the search
    // result in two function calls. First we filter out only those results from
    // the current line and then construct a new search result where we combine
    // all ranges and weights using a reducer. The NaN is just used so that we
    // can copy over static properties (which are the same across all results)
    // during the first iteration

    const newResult: SearchResult = fileMatches
      .filter(result => result.line === line)
      .reduce((acc, curr) => {
        if (Number.isNaN(acc.line)) {
          acc.line = curr.line
          acc.restext = curr.restext
        }

        acc.weight += curr.weight
        acc.ranges = acc.ranges.concat(curr.ranges)

        return acc
      }, {
        line: NaN,
        restext: '',
        weight: 0,
        ranges: []
      })

    // Last but not least sort the ranges so they're lined up for the renderer
    // to consume without any more processing necessary
    newResult.ranges.sort((rangeA, rangeB) => rangeA.to - rangeB.from)

    finalResults.push(newResult)
  }

  return finalResults
}
