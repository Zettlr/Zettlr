/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TextTransform
 * CVM-Role:        CodeMirror command
 * Maintainer:      Wang Yile
 * License:         GNU GPL v3
 *
 * Description:     This plugin contains a single text transformer that converts
 *                  straight quotes to curly (smart) quotes based on the user's
 *                  configured Magic Quotes settings.
 *
 * END HEADER
 */
import { transformSelectedText } from './transform-selected-text'
import { configField } from '../../util/configuration'

// Characters that indicate the next quote should be an opening quote.
// Reused from autocorrect.ts handleQuote logic.
const startChars = ' ([{-\u2013\u2014\n\r\t\v\f/\\'

/**
 * Convert straight quotes to curly (smart) quotes, using the user's configured
 * Magic Quotes characters. This is the inverse of `straightenQuotes`.
 *
 * @return  {StateCommand}       A `StateCommand` that curls straight quotes.
 */
export const curlQuotes = transformSelectedText((text, state) => {
  const { primary, secondary } = state.field(configField).autocorrect.magicQuotes
  const [ primaryOpen, primaryClose ] = primary.split('\u2026')
  const [ secondaryOpen, secondaryClose ] = secondary.split('\u2026')

  let result = ''

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (ch === '"') {
      const charBefore = i === 0 ? ' ' : text[i - 1]
      result += startChars.includes(charBefore) ? primaryOpen : primaryClose
    } else if (ch === "'") {
      const charBefore = i === 0 ? ' ' : text[i - 1]
      result += startChars.includes(charBefore) ? secondaryOpen : secondaryClose
    } else {
      result += ch
    }
  }

  return result
})
