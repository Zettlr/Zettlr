/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Replace Tags
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function can replace a set of tags across a file
 *
 * END HEADER
 */

import { getZknTagRE } from '@common/regular-expressions'
import { parseDocument, YAMLSeq } from 'yaml'
import extractYamlFrontmatter from './extract-yaml-frontmatter'

/**
 * Takes a Markdown document and replaces all occurrences of oldTag with newTag.
 * Returns the new document after replacing.
 *
 * @param   {string}        markdown  The document in question
 * @param   {string}        oldTag    The old tag to be replaced
 * @param   {string}        newTag    The new tag to replace the old one
 *
 * @return  {string}                  The new document
 */
export default function replaceTags (markdown: string, oldTag: string, newTag: string): string {
  if (!markdown.includes(oldTag)) {
    return markdown
  }

  // Since tags can occur in a frontmatter as well as in the document text, we
  // have the following combinations of possibilities:
  // 1. If the oldTag contains spaces --> Can only be in the frontmatter
  // 2. No spaces at all --> Can occur anywhere and has to be replaced anywhere
  // 3. Only newTag has spaces --> Remove oldTag from text, add newTag to frontmatter
  const { frontmatter, content } = extractYamlFrontmatter(markdown)

  if (frontmatter !== null) {
    const stringFrontmatter = markdown.slice(0, markdown.indexOf(content))
    const ast = parseDocument(stringFrontmatter)
    // Now, find the keywords or tags-property
    const prop = ast.get('keywords', true) ?? ast.get('tags', true)

    if (prop !== undefined && prop instanceof YAMLSeq) {
      for (const item of prop.items) {
        if (item.value === oldTag) {
          const [ start, valueEnd ] = item.range
          // Slice the correct position
          markdown = markdown.slice(0, start) + newTag + markdown.slice(valueEnd)
        }
      }

      // If the old tag contained a space, we are already done
      if (/\s/.test(oldTag)) {
        return markdown
      }
    }
  }

  // Now, we can do a much simpler approach to replacing the tag in the rest of
  // the content with simple RegEx.
  const tagRE = getZknTagRE(true)
  const newTagHasSpaces = /\s/.test(newTag)
  let match
  while ((match = tagRE.exec(markdown)) !== null) {
    if (match[1] === oldTag) {
      // Ensure that the tag is not an in-document link ([Title](#tag))
      const beforeMatch = markdown.slice(match.index - 2, match.index)
      if (beforeMatch === '](') {
        tagRE.lastIndex = match.index + match[0].length
        continue
      }

      const before = markdown.slice(0, match.index)
      // Account for two spaces before and after: If the character after the tag
      // is a space, "eat" that.
      const after = markdown.slice(match.index + match[0].length)
      // If the new tag contains spaces, we have to remove the tag here
      markdown = before + (newTagHasSpaces ? '' : `#${newTag}`) + after
      tagRE.lastIndex = match.index + newTag.length + 1
    }
  }

  return markdown
}
