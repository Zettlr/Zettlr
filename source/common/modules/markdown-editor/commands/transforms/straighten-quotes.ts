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
 * Straighten curly quotes, replacing `“ ‘ ’ ”` with `" ' ' "`.
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with curly quotes straightened.
 */
export const straightenQuotes = transformSelectedText((text) => {
  return text.replaceAll(/“|”/g, '"').replaceAll(/‘|’/g, '\'')
})
