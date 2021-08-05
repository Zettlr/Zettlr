/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Ville Kukkonen
 * License:         GNU GPL v3
 *
 * Description:     Given an array of language selectors as strings, this function will
 *                  generate a regex that matches fenced code block openings with given
 *                  language selectors.
 *
 * END HEADER
 */

/**
 * Given an array of language selectors as strings, this function will
 * generate a regex that matches fenced code block openings with given
 * language selectors.
 *
 * @param   {string[]}  selectors   The language selectors to match against (e.g. js)
 *
 * @return  {RegExp}                The regex
 */
module.exports = function generateRegexForHighlightMode (selectors) {
  // The following regex will match fenced code block headers with or without attribute lists.
  // Without attribute lists, the language selector is matched on the first word.
  // In attribute lists, the language is matched on the first word prefixed with a dot (.).
  return new RegExp(
    // ``` or ~~~ preceded by zero or more whitespace
    '^\\s*(?:`{3}|~{3})' +
        '\\s*(?:' + // zero or more whitespace followed by either...
            // ... word boundary ...
            '\\b|' +
            // ... { ...
            '{\\.|' +
            // ... { followed by anything up until first dot (.) preceded by whitespace
            '{([^\\.]*\\s)\\.)' +
        '(' + selectors.join('|') + ')\\b.*$')
}
