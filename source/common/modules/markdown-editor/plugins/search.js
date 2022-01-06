/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        MarkdownEditor Utility Functions
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is simply a collection of utility functions so that we
 *                  can keep the search logic out of the main editor class
 *                  which is already pretty big. This module can keep its own
 *                  internal state so that we can comfortably call the functions
 *                  and thus offload the work to this plugin instead of the main
 *                  class.
 *
 * END HEADER
 */

import makeSearchRegex from '@common/util/make-search-regex'

/**
 * Contains the current search term, necessary to detect changing search terms
 *
 * @var {string}
 */
let currentLocalSearch = ''

/**
 * Contains the current search cursor (if applicable)
 *
 * @var {SearchCursor|null}
 */
let searchCursor = null

/**
 * Contains the last search result
 *
 * @var {false|array}
 */
let lastSearchResult = false

/**
 * Contains the annotation bar for the matches on the scrollbar
 */
let matchAnnotationBar = null

/**
 * Contains all the text markers which highlight the search results on the scrollbar.
 *
 * @var {CodeMirror.TextMarker[]}
 */
const matchesInDocument = []

/**
 * Performs a one-shot search, either forward or backward
 *
 * @param   {CodeMirror.Editor}  cm       The CodeMirror instance
 * @param   {string}             term     The term to be searched
 * @param   {boolean}            forward  If true, searches next, else previous
 */
function search (cm, term, forward = true) {
  if (term.length === 0) {
    stopSearch()
    return
  }

  if (searchCursor === null || currentLocalSearch !== term) {
    // Start a new search
    startSearch(cm, term, cm.getCursor())
    search(cm, term, forward)
  } else if (searchCursor !== null) {
    // Search next/previous
    lastSearchResult = (forward) ? searchCursor.findNext() : searchCursor.findPrevious()

    if (lastSearchResult !== false) {
      // Another match
      cm.setSelection(searchCursor.from(), searchCursor.to())
    } else if (containsSearchTerm(cm, currentLocalSearch)) {
      // If the last search result returned false, but the document does contain
      // the term somewhere, this indicates we're past the last/first occurence
      // of the term and should start over.
      if (!forward) {
        // Start from the end of the document
        const lastLine = cm.doc.lastLine()
        const lastCh = cm.doc.getLine(lastLine).length
        startSearch(cm, currentLocalSearch, { line: lastLine, ch: lastCh })
      } else {
        // Start from the beginning
        startSearch(cm, currentLocalSearch)
      }
      search(cm, term, forward)
    } // Else: Search returned false, and the term does not occur in the document.
  }
}

/**
 * Replaces the current found search result. If no search is active, searches
 * for the first occurrence of term and then replaces.
 *
 * @param   {CodeMirror.Editor}  cm           The CodeMirror instance
 * @param   {string}             term         The term to be searched for
 * @param   {string}             replacement  The replacement string
 * @param   {boolean}            forward      The replacement direction (default: true)
 */
function replace (cm, term, replacement, forward = true) {
  if (searchCursor === null || currentLocalSearch !== term) {
    startSearch(cm, term)
    search(cm, term, forward)
  }

  if (lastSearchResult === false) {
    return // Nothing to replace
  }

  // First we need to check whether or not there have been capturing groups
  // within the search result. If so, replace each variable with one of the
  // matched groups from the last found search result. Do this globally for
  // multiple occurrences.
  for (let i = 1; i < lastSearchResult.length; i++) {
    // Replaces $1, $2, etc. with the corresponding search result
    replacement = replacement.replaceAll(`$${i}`, lastSearchResult[i])
  }

  searchCursor.replace(replacement)
  search(cm, term, true)
}

/**
 * Replaces all occurrences of term with replacement.
 *
 * @param   {CodeMirror.Editor}  cm           The CodeMirror instance
 * @param   {string}             term         The term to be replaced
 * @param   {string}             replacement  The replacement string.
 */
export function replaceAll (cm, term, replacement) {
  // Start a new search from the beginning of the document
  startSearch(cm, term)

  let result = searchCursor.findNext()

  while (result !== false) {
    let localReplacement = replacement
    for (let i = 1; i < result.length; i++) {
      localReplacement = localReplacement.replaceAll(`$${i}`, result[i])
    }

    searchCursor.replace(localReplacement)

    result = searchCursor.findNext()
  }
}

/**
 * Starts a new search (internal function)
 *
 * @param   {CodeMirror.Editor}  cm            The CodeMirror instance
 * @param   {string}             term          The search term
 * @param   {Cursor?}            startPosition An optional start position. Undefined defaults to beginning of document.
 */
function startSearch (cm, term, startPosition) {
  stopSearch()
  currentLocalSearch = term
  const regex = makeSearchRegex(currentLocalSearch)
  searchCursor = cm.getSearchCursor(regex, startPosition)

  if (matchAnnotationBar !== null) {
    matchAnnotationBar.clear()
  }

  // Also show all occurrences on the scrollbar
  // NOTE: Doesn't work on macOS since there scrollbars are hidden by default
  matchAnnotationBar = cm.showMatchesOnScrollbar(regex)

  // Finally, highlight the matches inside the actual document content
  highlightSearchResults(cm, regex)
}

/**
 * Stops a running search
 */
export function stopSearch () {
  currentLocalSearch = ''
  searchCursor = null
  lastSearchResult = false
  if (matchAnnotationBar !== null) {
    matchAnnotationBar.clear()
    matchAnnotationBar = null
  }

  unhighlightSearchResults()
}

/**
 * Highlights all occurrences of the search term within the document
 *
 * @param   {CodeMirror.Editor}  cm    The editor instance
 * @param   {RegExp}             term  The term, as a regular expression
 */
function highlightSearchResults (cm, term) {
  unhighlightSearchResults()
  const cursor = cm.getSearchCursor(term)
  while (cursor.findNext() !== false) {
    const mark = cm.markText(cursor.from(), cursor.to(), { className: 'cm-highlight' })
    matchesInDocument.push(mark)
  }
}

/**
 * Removes all markers that highlight search results within the document.
 */
function unhighlightSearchResults () {
  while (matchesInDocument.length > 0) {
    const marker = matchesInDocument.shift()
    if (marker.find() !== undefined) {
      marker.clear()
    }
  }
}

/**
 * Checks if a given term occurs in the current CodeMirror editor at all
 *
 * @param   {CodeMirror.Editor}  cm    The CodeMirror instance
 * @param   {string}             term  The search term
 *
 * @return  {boolean}                  Returns true if there is at least one occurrence, false otherwise.
 */
function containsSearchTerm (cm, term) {
  const val = cm.getValue()
  const regex = makeSearchRegex(term)
  return regex.test(val)
}

export function searchNext (cm, term) {
  search(cm, term, true)
}
export function searchPrevious (cm, term) {
  search(cm, term, false)
}
export function replaceNext (cm, term, replacement) {
  replace(cm, term, replacement, true)
}
export function replacePrevious (cm, term, replacement) {
  replace(cm, term, replacement, false)
}
