/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TextTransform
 * CVM-Role:        CodeMirror command
 * Maintainer:      Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This plugin contains a single text transformer.
 *
 * END HEADER
 */
import { transformSelectedText } from './transform-selected-text'

/**
 * Convert double quotes to single quotes in the selected text.
 *
 * @example `"I love you," said Elric` ➡️ `'I love you,' said Elric`
 * @example `'I love you,' said Elric` ➡️ `'I love you,' said Elric`
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with double quotes converted to single
 *                          quotes.
 */
export const doubleQuotesToSingle = transformSelectedText((text) => {
  return text.replaceAll('"', '\'')
})
