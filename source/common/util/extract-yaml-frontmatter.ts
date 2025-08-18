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

import YAML from 'yaml'

interface ExtractYamlFrontmatterReturn {
  frontmatter: Record<string, any>|null
  content: string
}

/**
 * Takes Markdown source and returns a parsed YAML frontmatter as an object or
 * null (if there was no frontmatter). NOTE: This function will always return
 * either null or an object with keys and values, as frontmatter in the context
 * of this function does NOT simply mean "valid YAML" (since that could also be
 * just a string or a number). So if the frontmatter consists solely of a
 * primitive or a list, this function will remove the frontmatter from the
 * content BUT return an empty object. This makes it easy to work with the
 * returned object but is strictly speaking opiniated.
 *
 * @param   {string}    markdown  The Markdown source
 *
 * @return  {any|null}            The parsed frontmatter as an object, or null.
 */
export default function extractYamlFrontmatter (markdown: string): ExtractYamlFrontmatterReturn {
  // Shortcut, since most files can be expected not to have a frontmatter
  if (!markdown.startsWith('---')) {
    return { frontmatter: null, content: markdown }
  }

  const ret: ExtractYamlFrontmatterReturn = {
    frontmatter: null,
    content: markdown
  }

  let linefeed = '\n'
  if (markdown.includes('\r\n')) {
    linefeed = '\r\n'
  }
  if (markdown.includes('\n\r')) {
    linefeed = '\n\r'
  }

  const lines = markdown.split(linefeed)

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

  if (start < 0) {
    return ret // No frontmatter
  }

  for (let i = start + 1; i < lines.length; i++) {
    if ([ '---', '...' ].includes(lines[i])) {
      end = i - 1
      break
    }
  }

  if (end < 0) {
    return ret // The frontmatter did not end
  }

  // Now we have a frontmatter (if there was any) -> extract!
  let frontmatter = ''
  for (let i = start; i <= end; i++) {
    frontmatter += '\n' + lines[i]
  }

  // Parse and return
  try {
    const parsedFrontmatter = YAML.parse(frontmatter)
    const isPrimitive = [ 'string', 'number', 'boolean' ].includes(typeof parsedFrontmatter)

    if (!isPrimitive && !Array.isArray(parsedFrontmatter)) {
      ret.frontmatter = parsedFrontmatter
    } else {
      // We have a frontmatter but it only consists of either a primitive or an
      // array. Since this function is assumed to return a Pandoc-parseable
      // frontmatter, we need to overwrite it here.
      ret.frontmatter = {}
    }

    // Remove frontmatter from content.
    ret.content = lines.slice(end + 2).join(linefeed)
    return ret
  } catch (err) {
    return ret
  }
}
