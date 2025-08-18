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

import { parseDocument, YAMLSeq } from 'yaml'
import extractYamlFrontmatter from './extract-yaml-frontmatter'
import { extractASTNodes, markdownToAST } from '@common/modules/markdown-utils'
import type { ZettelkastenTag } from '@common/modules/markdown-utils/markdown-ast'

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
          const [ start, valueEnd ] = item.range as [number, number]
          // Slice the correct position
          markdown = markdown.slice(0, start) + newTag + markdown.slice(valueEnd)
        }
      }

      // If the old tag contained a space, we are already done (since tags with
      // spaces can only occur in the frontmatter).
      if (/\s/.test(oldTag)) {
        return markdown
      }
    }
  }

  // Now, we can do a much simpler approach to replacing the tag in the rest of
  // the content with simple RegEx.
  const ast = markdownToAST(markdown)
  const tagNodes = extractASTNodes(ast, 'ZettelkastenTag') as ZettelkastenTag[]

  // Please NOTE that we are reversing the tagNodes array so that the positions
  // of the tags in the new document remain valid, even after replacing the tags
  const newTagHasSpaces = /\s/.test(newTag)
  for (const tagNode of tagNodes.reverse()) {
    if (tagNode.value !== oldTag) {
      continue
    }

    const before = markdown.slice(0, tagNode.from)
    const after = markdown.slice(tagNode.to)
    // If the new tag contains spaces, we have to remove the tag here
    markdown = before + (newTagHasSpaces ? '' : `#${newTag}`) + after
  }

  return markdown
}
