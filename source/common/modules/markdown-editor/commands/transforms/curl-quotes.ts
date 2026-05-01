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
import { type StateCommand } from '@codemirror/state'
import { transformSelectedText } from './transform-selected-text'

// Characters that indicate the next quote should be an opening quote.
// Reused from autocorrect.ts handleQuote logic.
const startChars = ' ([{-\u2013\u2014\n\r\t\v\f/\\'

/**
 * Convert straight quotes to curly (smart) quotes, using the user's configured
 * Magic Quotes characters. This is the inverse of `straightenQuotes`.
 *
 * @param   {string}  primary    The primary (double) Magic Quotes config, e.g. `\u201c\u2026\u201d`
 * @param   {string}  secondary  The secondary (single) Magic Quotes config, e.g. `\u2018\u2026\u2019`
 *
 * @return  {StateCommand}       A `StateCommand` that curls straight quotes.
 */
export function curlQuotes (primary: string, secondary: string): StateCommand {
  const [ primaryOpen, primaryClose ] = primary.split('\u2026')
  const [ secondaryOpen, secondaryClose ] = secondary.split('\u2026')

  return transformSelectedText((text) => {
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
}
