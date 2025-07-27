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
 * Convert single quotes to double quotes in the selected text.
 *
 * @example `'I love you,' said Elric` ➡️ `"I love you," said Elric`
 * @example `"I love you," said Elric` ➡️ `"I love you," said Elric`
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with single quotes converted to double
 *                          quotes.
 */
export const singleQuotesToDouble = transformSelectedText((text) => {
  return text.replaceAll('\'', '"')
})
