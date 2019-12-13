/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Extracts a YAML frontmatter
 *
 * END HEADER
 */

const YAML = require('yaml')

module.exports = function (markdown) {
  let lines = markdown.split(/\r?\n/)
  lines.unshift('') // For the start algorithm
  let start = -1
  let end = -1

  for (let i = 1; i < lines.length; i++) {
    // Either first line or in between, in both cases
    // this condition holds true due to the unshift above
    if (lines[i] === '---' && lines[i - 1] === '') {
      start = i
      break
    }
  }

  if (start < 0) return undefined // No frontmatter

  for (let i = start + 1; i < lines.length; i++) {
    if ([ '---', '...' ].includes(lines[i])) {
      end = i - 1
      break
    }
  }

  if (end < 0) return undefined // The frontmatter did not end

  // Now we have a frontmatter (if there was any) -> extract!
  let frontmatter = ''
  for (let i = start; i <= end; i++) {
    frontmatter += '\n' + lines[i]
  }

  // Parse and return
  try {
    return YAML.parse(frontmatter)
  } catch (err) {
    return undefined
  }
}
