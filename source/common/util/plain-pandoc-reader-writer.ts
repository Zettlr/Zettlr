/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getPlainPandocReaderWriter
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small utility function that can "sanitize" a reader or
 *                  writer specification
 *
 * END HEADER
 */

/**
 * A small utility function that strips off potential extensions from a reader
 * or writer specification (e.g. gfm+raw_html-ext) and returns the reader alone.
 *
 * @param   {string}  input  The "unsanitized" reader or writer specification
 *
 * @return  {string}         The plain specification without any extensions
 */
export default function getPlainPandocReaderWriter (input: string): string {
  if (input.includes('+')) {
    input = input.substring(0, input.indexOf('+'))
  }
  if (input.includes('-')) {
    input = input.substring(0, input.indexOf('-'))
  }

  return input
}
