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
export default function generateRegexForHighlightMode (selectors: string[]): RegExp {
  // The following regex will match fenced code block headers with or without attribute lists.
  // Without attribute lists, the language selector is matched on the first word.
  // In attribute lists, the language is matched on the first word prefixed with a dot (.).
  return new RegExp(
    // ``` or ~~~ preceded by zero or more whitespace
    '^\\s*(?:`{3}|~{3})' +
        // zero or more whitespace followed by either...
        '\\s*(?:' +
            // ... empty pattern, i.e. go directly to selectors ...
            '|' +
            // ... {. as a special case with no whitespace between the brace and dot...
            '{\\.|' +
            // ... { followed by anything up until first dot (.) preceded by whitespace.
            '{[^\\.]*\\s\\.' +
        // any of the given selectors
        ')(' + selectors.join('|') + ')\\b.*$')
}
