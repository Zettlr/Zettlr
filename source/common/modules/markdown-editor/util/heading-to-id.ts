/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        heading2ID function
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains the code required to transform a
 *                  heading string (e.g. "Àccélération") into its corresponding
 *                  Pandoc ID (e.g. "cclration")
 *
 * END HEADER
 */

/**
 * Converts an ATX heading (the contents without the indicator ###) to its
 * corresponding Pandoc ID representation. The algorithm is described here:
 * https://pandoc.org/MANUAL.html#extension-auto_identifiers
 *
 * @param   {string}  headingString  The regular heading string
 *
 * @return  {string}                 The string transformed into an ID
 */
export default function headingToID (headingString: string): string {
  let text = headingString
  // Remove all formatting, links, etc.
  text = text.replace(/[*_]{1,3}(.+)[*_]{1,3}/g, '$1')
  text = text.replace(/`[^`]+`/g, '$1')
  text = text.replace(/\[.+\]\(.+\)/g, '')
  // Remove all footnotes.
  text = text.replace(/\[\^.+\]/g, '')
  // Replace all spaces and newlines with hyphens.
  text = text.replace(/[\s\n]/g, '-')
  // Remove all non-alphanumeric characters, except underscores, hyphens, and periods.
  text = text.replace(/[^a-zA-Z0-9_.-]/g, '')
  // Convert all alphabetic characters to lowercase.
  text = text.toLowerCase()
  // Remove everything up to the first letter (identifiers may not begin with a number or punctuation mark).
  const letterMatch = /[a-z]/.exec(text)
  const firstLetter = (letterMatch !== null) ? letterMatch.index : 0
  text = text.substring(firstLetter)
  // If nothing is left after this, use the identifier section.
  if (text.length === 0) {
    text = 'section'
  }

  return text
}
