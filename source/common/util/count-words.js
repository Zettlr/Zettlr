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

// An array of Markdown block elements
const BLOCK_ELEMENTS = require('../data.json').block_elements

/**
 * Returns an accurate word count.
 * @param  {String} words The Markdown text to count
 * @param {Boolean} countChars Whether to count chars instead
 * @return {Number}       The number of words in the file.
 */
module.exports = function (words, countChars = false) {
  if (!words || typeof words !== 'string') return 0

  let tmp = words.split('\n')
  if (tmp[0] === '---') {
    // We probably got a frontmatter.
    // Either way, splice the first elem
    tmp.shift()
    let end = 0
    for (let i = 0; i < tmp.length; i++) {
      if ([ '...', '---' ].includes(tmp[i])) {
        end = i
        break
      }
    }

    // Reconstitute the words array, but without the frontmatter
    if (end > 0) words = tmp.slice(end + 1).join('\n')
  }

  // Now we need to remove comments, as these
  // should also not be in the word count.
  words = words.replace(/<!--.*?-->/gms, '')

  // Split by whitespace and additionally make sure that empty lines
  // are also removed so that \n\n counts as 0 words, not as two.
  words = words.split(/[\s ]+/).filter(word => word !== '')

  let i = 0

  // Remove block elements from word count to get a more accurate count.
  while (i < words.length) {
    if (BLOCK_ELEMENTS.includes(words[i])) {
      words.splice(i, 1)
    } else {
      i++
    }
  }

  if (countChars) words = [...words.join('')]

  return words.length
}
