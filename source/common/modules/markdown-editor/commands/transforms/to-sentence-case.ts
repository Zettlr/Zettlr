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
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'
import { transformSelectedText } from './transform-selected-text'

/**
 * Return a function that'll return a '`StateCommand` that converts selected
 * text to sentence case.
 *
 * @example `A Review of the Literature` ➡️ `A review of the literature`
 * @example `A review of the literature` ➡️ `A review of the literature`
 *
 * This is a higher-order function that itself returns a higher-order function
 * because we need to know the currently active locale which is configurable in
 * the editor; so, we need to be able to pass that value into this unit.
 *
 * Note that this transformation does not consider acronyms, nor initialisms,
 * nor honorifics.
 *
 * @param   {string}        locale  The current locale.
 *
 * @return  {StateCommand}          A `StateCommand` that converts selected text
 *                                  to sentence case.
 */
export const toSentenceCase =
  (locale: ConfigOptions['appLang']) => {
    const toWords = new Intl.Segmenter(locale, { granularity: 'word' })
    const toCharacters = new Intl.Segmenter(locale)

    return transformSelectedText((text) => {
      const sentenceCasedWords = []

      const words = toWords.segment(text)
      for (const word of words) {
        if (word.index === 0) {
          let theWord = ''

          const characters = toCharacters.segment(word.segment)
          for (const character of characters) {
            if (character.index === 0) {
              theWord += character.segment.toLocaleUpperCase(locale)
            } else {
              theWord += character.segment.toLocaleLowerCase(locale)
            }
          }

          sentenceCasedWords.push(theWord)
        } else {
          sentenceCasedWords.push(word.segment.toLocaleLowerCase(locale))
        }
      }

      return sentenceCasedWords.join('')
    })
  }
