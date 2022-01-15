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

import { MDFileDescriptor, CodeFileDescriptor } from '@dts/main/fsal'

// TODO: Need to collapse search results. Right now, individual matches on the
// same line are reported as separate matches, but in order to both save space,
// memory, and make the visual display more appealing we should really compress
// those better.

interface SearchOperator {
  operator: 'AND'|'NOT'
  word: string
}

interface SearchOrOperator {
  operator: 'OR'
  word: string[]
}

interface Range {
  from: number
  to: number
}

interface SearchResult {
  // term: string
  // The line's text content
  restext: string
  // The associated weight ("relevancy")
  weight: number
  // The line number
  line: number
  // The from-to ranges
  ranges: Range[]
  // from: any
  // to: any
}

export default function searchFile (
  fileObject: MDFileDescriptor|CodeFileDescriptor,
  terms: Array<SearchOperator|SearchOrOperator>,
  cnt: string
): SearchResult[] {
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
    return [{
      line: -1,
      ranges: [{ from: 0, to: fileObject.name.length }],
      restext: fileObject.name,
      weight: 2
    }]
  }

  // Now, pluck the not operators from the terms
  const termsToSearch = terms.filter(elem => elem.operator !== 'NOT')

  // First try to match the title and tags
  for (const t of termsToSearch) {
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
    return [{
      line: -1,
      ranges: [{ from: 0, to: fileObject.name.length }],
      restext: fileObject.name,
      weight: 2
    }]
  }

  // Now begin to search
  const fileMatches: SearchResult[] = []
  const resultLines: number[] = [] // Necessary for combining results later

  // Initialise the rest of the necessary variables
  let lines = cnt.split('\n')
  let linesLower = cntLower.split('\n')
  let termsMatched = 0

  for (const t of termsToSearch) {
    let hasTermMatched = false
    if (t.operator === 'AND') {
      for (let index = 0; index < lines.length; index++) {
        // Try both normal and lowercase
        if (lines[index].includes(t.word)) {
          fileMatches.push({
            line: index,
            restext: lines[index],
            ranges: [{
              from: lines[index].indexOf(t.word),
              to: lines[index].indexOf(t.word) + t.word.length
            }],
            weight: 1 // Weight indicates that this was an exact match
          })
          hasTermMatched = true
          resultLines.push(index)
        } else if (linesLower[index].includes(t.word.toLowerCase())) {
          fileMatches.push({
            line: index,
            restext: lines[index],
            ranges: [{
              from: linesLower[index].indexOf(t.word.toLowerCase()),
              to: linesLower[index].indexOf(t.word.toLowerCase()) + t.word.length
            }],
            weight: 0.5 // Weight indicates that this was an approximate match
          })
          hasTermMatched = true
          resultLines.push(index)
        }
      }
      // End AND operator
    } else if (t.operator === 'OR') {
      // OR operator.
      for (const wd of t.word) {
        let br = false
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
            hasTermMatched = true
            resultLines.push(index)
            br = true
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
            hasTermMatched = true
            resultLines.push(index)
            br = true
          }
        }

        if (br) {
          break
        }
      }
    } // End OR operator

    if (hasTermMatched) {
      termsMatched++
    }
  }

  // Post-process the search result. Right now, a lot of stuff is unsorted since
  // the whole document is first searched for the first AND-term, then the
  // second, etc. We're doing this here in the node main process, and not in the
  // renderer to save a few milliseconds of time (because no rendering actions
  // are being performed here in between).

  // First, sort all search results with regard to the lines in which they occur
  fileMatches.sort((resultA, resultB) => {
    // Should return a negative number if A < B
    return resultA.line - resultB.line
  })

  // Second, we can also combine results from the same line!
  const combinedResults: SearchResult[] = []
  // Remember we stupidly push numbers into the array, so we need to make it unique
  const sortedUniqueLines = [...new Set(resultLines.sort((a, b) => a - b))]
  for (const line of sortedUniqueLines) {
    // First, get the results on this line, we will get at least one result
    const lineResults = fileMatches.filter((result) => {
      return result.line === line
    })

    const newResult: SearchResult = {
      // Take over static results
      line: lineResults[0].line,
      restext: lineResults[0].restext,
      // And prepare those we'll combine
      weight: 0,
      ranges: []
    }

    for (const result of lineResults) {
      newResult.weight += result.weight
      newResult.ranges = newResult.ranges.concat(result.ranges)
    }

    // Last but not least sort the ranges so they're lined up for the renderer
    // to consume without any more processing necessary
    newResult.ranges.sort((rangeA, rangeB) => {
      // A comes before B if A.to is less than B.from
      return rangeA.to - rangeB.from
    })

    combinedResults.push(newResult)
  }

  if (termsMatched === termsToSearch.length) {
    return combinedResults
  } else {
    // Empty array indicating that not all required terms have matched
    return []
  }
}
