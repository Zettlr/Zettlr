/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Parenthesis detection in paths
 * CVM-Role:        Utility
 * Maintainer:
 * License:         GNU GPL v3
 *
 * Description:     Helps with parenthesis-detection in links/images rendering
 *
 * END HEADER
 */

/**
 * Helps with parenthesis-detection in links/images rendering
 * @param  {string} url     The currently detected url
 * @param  {number} line    The currently active line
 * @param  {object} curTo   The currently detected end of the link
 * @return {string}         The full url
 */
module.exports = function parenthesisDetection (url, line, curTo) {
  // The age-old problem of parenthesis-detection. In links & images rendering,
  // regular expression will not match all parentheses, if a link contains these,
  // so what we need is to go through the URL, and, if it contains opening parentheses
  // we need a matching pair of these, so we'll have to go through it one by one.

  // Known limitations:
  // 1. A link must always contain a matching pair
  //    → a path like 'path(likethis' will not work.
  // 2. Multiples parentheses must be enclosed in each other
  //    → a path like 'link(first)(second)' will not work.

  // As we will go to to the final parenthesis in []()
  // we must count in the very first parenthesis too!
  let openingParentheses = 1
  let closingParentheses = 0

  if (url !== '') {
    for (let i = 0; i < url.length; i++) {
      if (url.charAt(i) === '(') openingParentheses++
      if (url.charAt(i) === ')') closingParentheses++
    }

    if (openingParentheses > closingParentheses) {
      // If we're here, we most certainly have a non-closed parenthesis in a link
      let leftOvers = openingParentheses - closingParentheses

      // curTo.ch is currently located after the first closing parenthesis,
      // so we move it one character back
      curTo.ch--

      while (curTo.ch < line.length) {
        let currentChar = line.charAt(curTo.ch)
        curTo.ch++
        if (currentChar === ')') leftOvers--
        if (leftOvers === 0) break
        url += currentChar
      }

      // If we were unable to fully resolve all parentheses, abort.
      if (leftOvers > 0) return ''
    }
  }

  return url
}
