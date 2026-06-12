/**
 * BEGIN HEADER
 *
 * Contains:        Boolean Search functionality
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains various functions that can be used to
 *                  perform boolean searches over files. It provides a compiler
 *                  to turn Boolean search queries ("Ship | Boat") into
 *                  structured queries, and a search function that uses such a
 *                  compiled query to search in files.
 *
 * END HEADER
 */

import type { CodeFileDescriptor, MDFileDescriptor } from 'source/types/common/fsal'

type BooleanOperator = 'OR'|'AND'|'NOT'

export interface BooleanTerm {
  operator: BooleanOperator
  words: string[]
}

export interface SearchQueryBoolean {
  type: 'boolean'
  caseInsensitive: boolean
  terms: BooleanTerm[]
}

type FoundRange = { from: number, to: number, line: number }

export interface MetadataSearchResult {
  type: 'metadata'
  /**
   * The weight is a relevancy score: The higher, the better was this match.
   */
  weight: number
}

export interface FileContentSearchResult {
  type: 'content'
  /**
   * The weight is a relevancy score: The higher, the better was this match.
   */
  weight: number
  /**
   * An excerpt that surrounds the match.
   */
  excerpt: string
  /**
   * The line number where the match was found. If line is -1, this indicates a
   * match in the filename or the file's tags.
   */
  line: number
  /**
   * Wherever on this line something matched, the ranges indicate from which
   * character to which something matched. Can be used for highlighting.
   */
  ranges: Array<{ from: number, to: number }>
}

/**
 * A Search result contains all matches found in the specified file.
 */
export type SearchResult = Array<MetadataSearchResult|FileContentSearchResult>

/**
 * Takes a search query that uses the boolean search syntax and compiles it into
 * a structured query that can be used to match files based on these rules.
 *
 * @param   {string}          query            The search query
 * @param   {boolean}         caseInsensitive  Whether to compile the terms
 *                                             case-insensitive (default: true)
 *
 * @return  {SearchQueryBoolean}               The compiled boolean search
 */
export function compileBooleanQuery (query: string, caseInsensitive: boolean = true): SearchQueryBoolean {
  if (caseInsensitive) {
    query = query.toLowerCase()
  }

  const compiledQuery: SearchQueryBoolean = {
    type: 'boolean',
    caseInsensitive,
    terms: []
  }

  let curWord = ''
  let hasExact = false
  let operator: BooleanOperator = 'AND'

  for (let i = 0; i < query.length; i++) {
    const c = query.charAt(i)
    if (c === ' ' && !hasExact) {
      // Spaces mark the end of one search term (except we're in an exact match)
      if (curWord.trim() !== '') {
        compiledQuery.terms.push({ words: [curWord.trim()], operator })
        curWord = ''
        operator = 'AND' // Reset the operator
      }
      continue
    } else if (c === '|') {
      // We got an OR operator
      // If the next character is a space, we can use a shortcut here
      if (query.charAt(i + 1) === ' ') {
        ++i
      }

      // We know additionally know that the previous operator was an or. But
      // let's check that the user hasn't accidentally deleted one OR-word and
      // now their current search STARTS with a pipe character. If not, we will
      // disregard this OR character and treat what's coming as an AND
      if (compiledQuery.terms.length > 0) {
        compiledQuery.terms[compiledQuery.terms.length - 1].operator = 'OR'
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
        compiledQuery.terms.push({ words: [curWord], operator })
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

    curWord += query.charAt(i)
  }

  // Now that we're through the search terms, clean up

  // If there is a last word (in most cases it should be), add it to the list
  if (curWord.trim() !== '') {
    compiledQuery.terms.push({ words: [curWord.trim()], operator })
  }

  // Now pack together all consecutive ORs
  // to make it easier for the search in the main process
  let currentOr: BooleanTerm = { operator: 'OR', words: [] }

  const newTerms: BooleanTerm[] = []

  for (let i = 0; i < compiledQuery.terms.length; i++) {
    if (compiledQuery.terms[i].operator !== 'OR') {
      if (currentOr.words.length > 0) {
        // Duplicate object so that the words are retained
        newTerms.push(currentOr)
        currentOr = { operator: 'OR', words: [] }
      }
      newTerms.push(compiledQuery.terms[i])
    } else {
      currentOr.words = currentOr.words.concat(compiledQuery.terms[i].words)
    }
  }

  // Now push the currentOr if not empty
  if (currentOr.words.length > 0) {
    newTerms.push(currentOr)
  }

  compiledQuery.terms = newTerms

  return compiledQuery
}

/**
 * Performs a full text boolean search on the given fileObject. Returns a result
 * set which contains all matches in the file based on the query.
 *
 * @return  {SearchResult[]}  The result set
 */
export function searchFileBoolean (descriptor: MDFileDescriptor|CodeFileDescriptor, fileContent: string, query: SearchQueryBoolean): SearchResult {
  // Prepare the data to be searched, based on the query
  // Ensure that the file has only LF as line endings (needed to determine lines)
  fileContent = normalizeLineEndings(fileContent)
  // Metadata based on whether the query is case insensitive
  const fileName = query.caseInsensitive ? descriptor.name.toLowerCase() : descriptor.name
  const content = query.caseInsensitive ? fileContent.toLowerCase() : fileContent
  const matches: SearchResult = []

  // First, check for NOT-terms. Since NOT-operators immediately exclude a file,
  // we can use this to reduce the amount of work.
  const notOperators = query.terms.filter(elem => elem.operator === 'NOT')
  const notWords = notOperators.reduce<string[]>((acc, curr) => acc.concat(curr.words), [])
  for (const term of notWords) {
    if (fileName.includes(term) || content.includes(term)) {
      return []
    }
  }

  // The file did not contain any excluding terms, but the user also has not
  // specified any terms to search for. Therefore, short-circuit here.
  if (notOperators.length === query.terms.length) {
    return [{ type: 'metadata', weight: 2 }]
  }

  // Now, start the actual search.

  const termsToSearch = query.terms.filter(elem => elem.operator !== 'NOT')
  let termsMatched = 0

  // We go in two rounds. First, search the metadata, since that is a bit more
  // involved. Afterwards, we search the content.
  for (const t of termsToSearch) {
    const matchedWords = new Set<string>()
    // Match all words of the search term. For AND, all have to be matched, for
    // OR only a single one needs to match.
    for (const wd of t.words) {
      if (fileName.includes(wd) || (descriptor.type === 'file' && descriptor.tags.includes(wd))) {
        matchedWords.add(wd)
        if (t.operator === 'OR') {
          break
        }
      } else if (wd[0] === '#' && descriptor.type === 'file' && descriptor.tags.includes(wd.substring(1))) {
        // Account for a potential # in front of the tag
        matchedWords.add(wd)
        if (t.operator === 'OR') {
          break
        }
      }
    }

    // Now verify the matched terms. For OR, we only need a single match, for
    // AND, the matches must be the same length as the requested words.
    if (t.operator === 'OR' && matchedWords.size > 0) {
      termsMatched++
    } else if (matchedWords.size === t.words.length) {
      termsMatched++
    }
  }

  // Save the info on whether all terms have been matched in the metadata alone.
  const hasAllTermsMatchedInMetadata = termsMatched !== termsToSearch.length

  // Now, regardless of whether we have already matched everything in the
  // metadata, perform a search over the full text. This way we can show
  // additional context to the user and provide better results.

  // Reset the matched terms so that we can check if all terms have been matched
  // in the full text, too.
  termsMatched = 0

  for (const t of termsToSearch) {
    const matchedWords = new Set<string>()
    for (const wd of t.words) {
      const newMatches: SearchResult = findAll(wd, content)
        // First, reduce all to sets of same lines
        .reduce<Array<{ line: number, ranges: Array<{ from: number, to: number }> }>>((prev, cur) => {
          const existing = prev.find(val => val.line === cur.line)
          if (existing !== undefined) {
            existing.ranges.push({ from: cur.from, to: cur.to })
            return prev
          }

          prev.push({ line: cur.line, ranges: [{ from: cur.from, to: cur.to }] })
          return prev
        }, [])
        // Then map those to the actual results
        .map(({ ranges, line }) => {
          const { relativeRanges, excerpt } = getTextSurrounding(ranges, fileContent)
          return {
            type: 'content', line, ranges: relativeRanges, weight: 1,
            excerpt
          } satisfies FileContentSearchResult
        })

      if (newMatches.length > 0) {
        matchedWords.add(wd)
        matches.push(...newMatches)
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

  // Post-process the search result. Right now, a lot of stuff is unsorted since
  // the whole document is first searched for the first AND-term, then the
  // second, etc.

  // First, sort all search results with regard to the lines in which they occur
  matches.sort((resultA, resultB) => {
    if (resultA.type === 'metadata' && resultB.type === 'content') {
      return -1
    } else if (resultA.type === 'content' && resultB.type === 'metadata') {
      return 1
    } else if (resultA.type === 'metadata' && resultB.type === 'metadata') {
      return 0
    } else if (resultA.type === 'content' && resultB.type === 'content') {
      return resultA.line - resultB.line
    } else {
      return 0
    }
  })

  // Now one final check. If we did not match all required terms in the full
  // content, this file should not be considered a match. However, if we did
  // match all terms in the metadata already, then even if not all of the search
  // terms occurred in the full text, this file is still considered a match.
  if (termsMatched !== termsToSearch.length) {
    return hasAllTermsMatchedInMetadata ? matches : []
  } else {
    // All terms have matched -> return result.
    return matches
  }
}

// Utility functions
/**
 * Finds all occurrences of the search string in the provided text. Returns a
 * list of all matches alongside their start and end index (document-relative),
 * and the line on which they are. NOTE: This means that the text should have
 * normalized line endings using only LF!
 *
 * @param   {string}        searchString  The text to search
 * @param   {string}        text          The full text
 *
 * @return  {FoundRange[]}                All occurrences
 */
function findAll (searchString: string, text: string): FoundRange[] {
  const results: FoundRange[] = []

  let startIndex = 0
  let index = -1
  let lineNo = 1

  while ((index = text.indexOf(searchString, startIndex)) > -1) {
    lineNo += lineOf(startIndex, index, text)
    results.push({ from: index, to: index + searchString.length, line: lineNo })
    startIndex = index + 1
  }

  return results
}

/**
 * Determines the line of the provided index in the string.
 *
 * @param   {number}  index  The index
 * @param   {string}  text   The full text
 *
 * @return  {number}         The line number
 */
function lineOf (from: number, to: number, text: string): number {
  return [...text.slice(from, to).matchAll(/\n/g)].length
}

/**
 * Normalizes the line endings in the provided string to only LF.
 *
 * @param   {string}  text  The possibly unsanitized text
 *
 * @return  {string}        The sanitized text.
 */
function normalizeLineEndings (text: string): string {
  return text.split(/\r\n|\n\r|\n|\r/g).join('\n')
}

/**
 * Returns a window of text surrounding the range indicated.
 * 
 * @param   {number}  from    The start index
 * @param   {number}  to      The end index
 * @param   {string}  text    The text to extract from
 * @param   {number}  window  The length to extract from each side, default: 40
 * 
 * @return  {string}          The extracted text window
 */
function getTextSurrounding (ranges: Array<{ from: number, to: number }>, text: string, window: number = 40): { relativeRanges: Array<{ from: number, to: number }>, excerpt: string } {
  const from = Math.min(...ranges.map(r => r.from))
  const to = Math.max(...ranges.map(r => r.to))

  const prefix = from - window > 0 ? '…' : ''
  const suffix = to + window < text.length - 1 ? '…' : ''
  
  const start = Math.max(0, from - window)
  const end = Math.min(text.length, to + window)
  
  const slice = text.slice(start, end)

  return {
    excerpt: `${prefix}${slice}${suffix}`,
    relativeRanges: ranges.map(r => {
      return { from: r.from - start + prefix.length, to: r.to - start + prefix.length }
    })
  }
}
