/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        JSON code folding service
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Folding service that can fold JSON files.
 *
 * END HEADER
 */

import { foldService } from '@codemirror/language'

// Code folding for JSON documents
export const jsonFolding = foldService.of((state, lineStart, lineEnd) => {
  // The problem with the JSON code is that we only have the relatively simple
  // Stream parser that has only a very limited number of tags. Therefore, we
  // cannot utilize the parse tree, and instead have to do plain old string
  // matching.
  const slice = state.sliceDoc(lineStart, lineEnd)
  if (!slice.includes('[') && !slice.includes('{')) {
    return null // No fold region can start here
  }

  const openBracket = slice.includes('[') ? '[' : '{'
  const closeBracket = openBracket === '[' ? ']' : '}'

  const foldBegin = lineStart + slice.indexOf(openBracket) + 1 // fold starts AFTER bracket
  let foldEnd = foldBegin

  const contents = state.sliceDoc()
  let openBrackets = 0
  while (foldEnd < contents.length) {
    const char = contents[foldEnd]
    if (char === openBracket) {
      openBrackets++
    } else if (char === closeBracket && openBrackets > 0) {
      openBrackets--
    } else if (char === closeBracket && openBrackets === 0) {
      // found it!
      break
    }
    foldEnd++
  }

  if (foldBegin === foldEnd) {
    return null
  }

  return { from: foldBegin, to: foldEnd }
})
