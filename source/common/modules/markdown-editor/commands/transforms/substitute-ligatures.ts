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

type Substitution = {
  target: string
  replacement: string
}

const SUBSTITUTIONS_LIGATURE: ReadonlyArray<Substitution> = [
  {
    target: '\u00C6',
    replacement: 'AE',
  },
  {
    target: '\u00E6',
    replacement: 'ae',
  },
  {
    target: '\u0132',
    replacement: 'IJ',
  },
  {
    target: '\u0133',
    replacement: 'ij',
  },
  {
    target: '\u0152',
    replacement: 'OE',
  },
  {
    target: '\u0153',
    replacement: 'oe',
  },
  {
    target: '\uFB00',
    replacement: 'ff',
  },
  {
    target: '\uFB01',
    replacement: 'fi',
  },
  {
    target: '\uFB02',
    replacement: 'fl',
  },
  {
    target: '\uFB03',
    replacement: 'ffi',
  },
  {
    target: '\uFB04',
    replacement: 'ffl',
  },
  {
    target: '\uFB05',
    replacement: 'st',
  },
  {
    target: '\uFB06',
    replacement: 'st',
  },
]

/**
 * Return a function that'll return a `StateCommand` to substitute ligatures,
 * expanding them as necessary.
 *
 * This is a higher-order function that itself returns a higher-order function
 * because we need to know the substitutions.
 *
 * @param   {string}        substitutions  The substitutions.
 *
 * @return  {StateCommand}  A `StateCommand` to substitute ligatures.
 */
export const substituteLigatures = transformSelectedText((text) => {
  return SUBSTITUTIONS_LIGATURE.reduce(
    (memo, substitution) =>
      memo.replaceAll(
        new RegExp(substitution.target, 'g'),
        substitution.replacement
      ),
    text
  )
})
