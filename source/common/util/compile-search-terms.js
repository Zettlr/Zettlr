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

module.exports = function (term) {
  // First sanitize the terms
  let myTerms = []
  let curWord = ''
  let hasExact = false
  let operator = 'AND'

  for (let i = 0; i < term.length; i++) {
    let c = term.charAt(i)
    if ((c === ' ') && !hasExact) {
      // Eat word and next
      if (curWord.trim() !== '') {
        myTerms.push({ 'word': curWord.trim(), 'operator': operator })
        curWord = ''
        operator = 'AND' // Reset the operator
      }
      continue
    } else if (c === '|') {
      // We got an OR operator
      // So change the last word's operator and set current operator to OR
      operator = 'OR'
      // Take a look forward and if the next char is also a space, eat it right now
      if (term.charAt(i + 1) === ' ') ++i
      // Also the previous operator should also be set to or
      myTerms[myTerms.length - 1].operator = 'OR'
      continue
    } else if (c === '"') {
      if (!hasExact) {
        hasExact = true
        continue
      } else {
        hasExact = false
        // Do not trim the word to account for trailing and
        // ending whitespace within an exact capturing group
        myTerms.push({ 'word': curWord, 'operator': operator })
        curWord = ''
        operator = 'AND' // Reset the operator
        continue
      }
      // Don't eat the quote
    } else if (c === '!' && !hasExact && curWord === '') {
      // An exclamation mark only has meaning if it is preceeded
      // by a space and not within an exact match. Preceeded by
      // space is indicated by an empty curWord variable.
      operator = 'NOT'
      continue // We don't want the ! in the term
    }

    curWord += term.charAt(i)
  }

  // Afterwards eat the last word if its not empty
  if (curWord.trim() !== '') {
    myTerms.push({ 'word': curWord.trim(), 'operator': operator })
  }

  // Now pack together all consecutive ORs
  // to make it easier for the search in the main process
  let currentOr = {}
  currentOr.operator = 'OR'
  currentOr.word = []
  let newTerms = []

  for (let i = 0; i < myTerms.length; i++) {
    if (myTerms[i].operator !== 'OR') {
      if (currentOr.word.length > 0) {
        // Duplicate object so that the words are retained
        newTerms.push(JSON.parse(JSON.stringify(currentOr)))
        currentOr.word = []
      }
      newTerms.push(myTerms[i])
    } else if (myTerms[i].operator === 'OR') {
      currentOr.word.push(myTerms[i].word)
    }
  }

  // Now push the currentOr if not empty
  if (currentOr.word.length > 0) {
    newTerms.push(JSON.parse(JSON.stringify(currentOr)))
  }

  return newTerms
}
