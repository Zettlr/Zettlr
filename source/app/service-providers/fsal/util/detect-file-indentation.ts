/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        detectFileIndentation
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module detects the most prevalent line indentation
 *                  mechanism of a text file. It can account for tabs or spaces
 *                  of variable length.
 *
 * END HEADER
 */

/**
 * Returns the amount of uninterrupted space characters at the beginning of the
 * line.
 *
 * @param   {string}  line  The line's text contents
 *
 * @return  {number}        The number of leading spaces
 */
function getLeadingSpacesCount (line: string): number {
  let count = 0
  for (const char of line) {
    if (char !== ' ') {
      return count
    }
    count++
  }

  return count
}

/**
 * Utility function that takes a list of lines (i.e., already split on newlines)
 * and returns a pair of elements. The first element is either a tab or a space,
 * reflecting which character is being used to indent in the file, and the
 * second element contains the amount of repeated characters used for
 * indentation, which is defined as 1 in the case of tabs, or any higher number
 * in the case of spaces.
 *
 * @param   {string[]}          lines  The lines of the file
 *
 * @return  {[string, number]}         An element tuple of `['\t'|' ', number]`
 */
export function detectFileIndentation (lines: string[]): [ '\t'|' ', number ] {
  // NOTE: This function is taken from Heather Arthur and adapted for our case.
  // Source: https://gist.github.com/harthur/c6c939a938db52064a7a
  // cf. original article: https://heathermoor.medium.com/detecting-code-indentation-eff3ed0fb56b
  const indents: Record<string, number> = {}
  let lastIndentSize = 0

  // First round, count the occurrences of any type of indentation differences
  for (const line of lines) {
    if (line.startsWith('\t')) {
      indents['\t'] = (indents['\t'] || 0) + 1
    } else {
      const spacesCount = getLeadingSpacesCount(line)
      const difference = Math.abs(spacesCount - lastIndentSize)
      const currentIndentation = ' '.repeat(difference)
      if (difference > 1) {
        indents[currentIndentation] = (indents[currentIndentation] || 0) + 1
      }
      lastIndentSize = spacesCount
    }
  }

  // Second round: Determine which indent diff is most prevalent in the file
  let detectedIndentation = '    ' // By default, assume 4 spaces indentation
  let max = 0
  for (const [ indent, count ] of Object.entries(indents)) {
    if (count > max) {
      max = count
      detectedIndentation = indent
    }
  }

  // Return the detected indentation
  return [ detectedIndentation.slice(0, 1) as '\t'|' ', detectedIndentation.length ]
}
