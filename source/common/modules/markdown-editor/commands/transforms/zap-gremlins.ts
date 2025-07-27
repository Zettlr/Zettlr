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
 * Strip out all of the Unicode characters falling within the range of `#x00` to
 * `#x1F`, save for the necessary `#x09`, `#x0A`, `#x0C` and `#X0D` characters,
 * which are used to print spaces, line returns, page breaks, and tabs in your
 * text.
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The transformed text.
 */
export const zapGremlins = transformSelectedText((text) => {
  return text.replaceAll(/\u0000|\u0001|\u0002|\u0003|\u0004|\u0005|\u0006|\u0007|\u0008|\u000B|\u000E|\u000F|\u0010|\u0011|\u0012|\u0013|\u0014|\u0015|\u0016|\u0017|\u0018|\u0019|\u001A|\u001B|\u001C|\u001D|\u001E|\u001F|\u00AD|\u200A/g, '')
})
