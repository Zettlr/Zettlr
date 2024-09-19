/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        normalizeLineEndings
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A utility function to normalize line endings.
 *
 * END HEADER
 */

/**
 * Utility function that takes in a file's contents, splits it according to any
 * available line ending, ordered by prevalence (CRLF, LFCR, LF, CR), and then
 * joins the lines with a simple linefeed (LF, `\n`).
 *
 * @param   {string}  text  The unsanitized text
 *
 * @return  {string}        The text with all linefeeds normalized to LF.
 */
export function normalizeLineEndings (text: string): string {
  return text
    // Always split with a regular expression to ensure that mixed linefeeds
    // don't break reading in a file. Then, on save, the linefeeds will be
    // standardized to whatever the linefeed extractor detected.
    .split(/\r\n|\n\r|\n|\r/g)
    .join('\n')
}
