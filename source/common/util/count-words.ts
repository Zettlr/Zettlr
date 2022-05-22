/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to count words.
 *
 * END HEADER
 */

import { getBlockMathRE, getCodeBlockRE } from '../regular-expressions'
import extractYamlFrontmatter from './extract-yaml-frontmatter'

const mathRE = getBlockMathRE()
const codeRE = getCodeBlockRE(true)
const inlineRE = /(?:[_*`]{1,3})(.+?)(?:[_*`]{1,3})/gi
const interpunctionRE = /^[-–—.…:;,'%/\\_¡!¿?()[\]{}]+$/

/**
 * Returns an accurate word count.
 * @param  {String} words The Markdown text to count
 * @param {Boolean} countChars Whether to count chars instead
 * @return {Number}       The number of words in the file.
 */
export default function (markdown: string, countChars: boolean|'nospace' = false): number {
  // First, get rid of a potential frontmatter
  let content: string|string[] = extractYamlFrontmatter(markdown).content

  // Now we need to remove a few things which shouldn't count towards the total
  content = content.replace(/<!--.*?-->/gms, '') // Comments
  content = content.replace(mathRE, '') // Display Math equations
  content = content.replace(codeRE, '') // Code blocks
  content = content.replace(/^#+\s+/gm, '') // Headings
  content = content.replace(/^\s*(?:[*+-]|\d+\.|\[(?: |x)\])\s+/igm, '') // List items (the bullets)
  content = content.replace(inlineRE, '$1') // A bunch of inline stuff

  // At this point we should have a string that is more or less plain text, so
  // we can either count the words or characters.

  if (countChars === false) {
    // Will return the length of the resultant array instead of the string
    content = content.split(/[\s ]+/).filter(word => word.trim() !== '')
    // Additionally, remove interpunction-only words
    content = content.filter(word => !interpunctionRE.test(word))
  } else if (countChars === 'nospace') {
    content = content.replace(/ +/g, '')
  }

  return content.length
}
