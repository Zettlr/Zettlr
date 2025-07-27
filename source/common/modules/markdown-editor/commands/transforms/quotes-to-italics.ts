import type { EditorConfiguration } from '../../util/configuration'
import { delimit } from './support/delimit'
import { transformSelectedText } from './transform-selected-text'

/**
 * Return a function that'll return a '`StateCommand` that converts quoted
 * delimiters to italic delimiters.
 *
 * @example `"Cultures in Orbit"` ➡️ `_Cultures in Orbit_`
 * @example `"Cultures in Orbit"` ➡️ `*Cultures in Orbit*`
 *
 * This is a higher-order function that itself returns a higher-order function
 * because the specific character used for italics is configurable in the
 * editor; so, we need to be able to pass that value into this unit.
 *
 * @param   {string}  italics  The italic delimiter.
 *
 * @return  {StateCommand}     A `StateCommand` that converts quoted
 *                             delimiters to italic delimiters.
 */
export const quotesToItalics =
  (italics: EditorConfiguration['italicFormatting']) => {
    const delimitByQuotes = delimit('"')

    return transformSelectedText((text) => {
      const chunks = delimitByQuotes(text)

      return chunks.reduce((changedText, chunk) => {
        switch (chunk.kind) {
          case 'not-delimited-text': {
            return changedText + chunk.text
          }

          case 'delimited-text': {
            return changedText + italics + chunk.text + italics
          }

          default: {
            return ((_: never) => changedText)(chunk)
          }
        }
      }, '')
    })
  }
