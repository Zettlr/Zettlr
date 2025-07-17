import { delimit, replaceWith } from './support/delimit'
import { transformSelectedText } from './transform-selected-text'

/**
 * Convert paired single quotes and paired backticks to double-quotes.
 *
 * @example `Oh 'such' joy` ➡️ `Oh "such" joy`
 * @example `Oh `such` joy` ➡️ `Oh "such" joy`
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with paired single quotes and paired
 *                          backticks converted to double-quotes.
 */
export const toDoubleQuotes = transformSelectedText((text) => {
  const replace = replaceWith('"')

  // replace paired single quotes
  const interim = replace(delimit('\'')(text))

  // replace paired backticks
  return replace(delimit('`')(interim))
})
