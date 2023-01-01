/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractFileID
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small function that can extract a file ID from a MD file.
 *
 * END HEADER
 */

import { getIDRE } from '@common/regular-expressions'

/**
 * Extracts a file ID from the content of a Markdown document. NOTE that this
 * function expects the full, unadultered file, do not pass a file without its
 * YAML frontmatter or without code blocks.
 *
 * @param   {string}  filename   The filename (in case that contains the ID)
 * @param   {string}  markdown   The full contents of the file
 * @param   {string}  idPattern  The ID pattern as defined by the user
 *
 * @return  {string}             The found ID, an empty string otherwise
 */
export default function extractFileId (
  filename: string,
  markdown: string,
  idPattern: string
): string {
  const idRE = getIDRE(idPattern)

  // First, try to find an ID in the file's name
  const filenameMatch = idRE.exec(filename)
  if (filenameMatch !== null) {
    return filenameMatch[1]
  }

  // Then, take a look at the content. Precedence goes to the first ID found.
  for (const match of markdown.matchAll(idRE)) {
    if (match.index === undefined) {
      continue // This is because TypeScript doesn't know about the global flag
    }

    if (markdown.substring(match.index - 2, match.index) !== '[[') {
      // Found an ID. Make sure the ID doesn't start with linkStart and not end
      // with the linkEnd
      if (!match[1].endsWith(']]')) {
        return match[1]
      }
    }
  }

  return '' // No ID found
}
