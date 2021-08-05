/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        shouldMatchTag
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This small utility function filters out things that look
 *                  like tags but aren't.
 *
 * END HEADER
 */

const digitTags = /^#\d+$/
const colourTags = /^#[a-f0-9]{3}$|^#[a-f0-9]{6,8}$/i

/**
 * This function returns true if the text is in fact something that should be
 * considered a tag. It returns false for pure-digit texts and hexadecimal
 * colour values. This function is meant to accompany the tag regexp.
 *
 * @param   {string}   text  The potential tag (including the #!)
 *
 * @return  {boolean}        False if this looks like a tag but shouldn't be treated as such.
 */
export default function shouldMatchTag (text: string): boolean {
  if (digitTags.test(text)) {
    // It is common in English to write #1 as a shortcut for "number 1"
    // I hope that it is also uncommon to generally use number-only tags. If
    // not, we may have to remove this again.
    return false
  }

  if (colourTags.test(text)) {
    return false // It's likely an RGB hex-value
  }

  return true
}
