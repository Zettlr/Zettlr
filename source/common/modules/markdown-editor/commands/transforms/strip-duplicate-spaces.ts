import { transformSelectedText } from './transform-selected-text'

/**
 * Strip duplicate spaces from selected text.
 *
 * Sequences of two or more spaces will be collapsed to a single space.
 *
 * Note that sequences of interleaved whitespace such as `\t \t \t ` will _not_
 * lead to any collapsing: _only_ sequences of two or more _spaces_ will be
 * collapsed to a single space.
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with all duplicate spaces stripped.
 */
export const stripDuplicateSpaces = transformSelectedText((text) => {
  return text.replaceAll(/ {2,}/g, ' ')
})
