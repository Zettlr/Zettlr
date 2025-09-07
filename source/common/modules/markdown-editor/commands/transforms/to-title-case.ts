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
 * text to title case.
 *
 * @example `A review of the literature` ➡️ `A Review Of The Literature`
 * @example `A Review Of The Literature` ➡️ `A Review Of The Literature`
 *
 * This is a higher-order function that itself returns a higher-order function
 * because we need to know the currently active locale which is configurable in
 * the editor; so, we need to be able to pass that value into this unit.
 *
 * @param   {string}        locale  The locale.
 *
 * @return  {StateCommand}          A `StateCommand` that converts selected text
 *                                  to title case.
 */
export const toTitleCase =
  (locale: ConfigOptions['appLang']) => {
    const toWords = new Intl.Segmenter(locale, { granularity: 'word' })

    const capitalize = capitalizeFor(locale)

    return transformSelectedText((text) => {
      const titleCasedWords: string[] = []

      const words = toWords.segment(text)

      for (const word of words) {
        if (word.isWordLike === true) {
          titleCasedWords.push(capitalize(word))
        } else {
          // it's a number/emoji/whitespace: don't bother capitalizing it
          titleCasedWords.push(word.segment)
        }
      }

      return titleCasedWords.join('')
    })
  }

/**
 * Return a function that'll capitalize words using the `locale`'s rules.
 *
 * @param   {string}  locale   the locale.
 *
 * @return  {Function}         a capitalizing function.
 */
function capitalizeFor (locale: ConfigOptions['appLang']) {
  const toCharacters = new Intl.Segmenter(locale)

  return (word: Intl.SegmentData): string => {
    const [ first, ...rest ] = [...toCharacters.segment(word.segment)]

    return [
      first.segment.toLocaleUpperCase(locale),
      ...rest.map(({ segment }) => segment)
    ].join('')
  }
}
