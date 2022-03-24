/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractTags
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function extracts tags/keywords from a Markdown string
 *
 * END HEADER
 */

import { getZknTagRE } from '@common/regular-expressions'
import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'

export default function extractTags (markdown: string): string[] {
  let tags: string[] = []

  // Extract a potential YAML frontmatter
  const { content, frontmatter } = extractYamlFrontmatter(markdown)
  const tagRE = getZknTagRE(true)
  // Remove links, since these can also point to headings and thus would be
  // detected as tags accidentally
  const linkRE = /\[([^\]]+)\]\((.+?)\)/g

  // First, go through the keywords within the text
  for (const match of content.replace(linkRE, '').matchAll(tagRE)) {
    const tag = match[1].replace(/#/g, '')

    if (tag.length > 0) {
      tags.push(match[1].toLowerCase())
    }
  }

  if (frontmatter === null) {
    return [...new Set(tags)]
  }

  // Then, merge keywords from the frontmatter
  for (const prop of [ 'keywords', 'tags' ]) {
    if (frontmatter[prop] != null) {
      // The user can just write "keywords: something", in which case it won't be
      // an array, but a simple string (or even a number <.<). I am beginning to
      // understand why programmers despise the YAML-format.
      if (!Array.isArray(frontmatter[prop]) && typeof frontmatter[prop] === 'string') {
        const keys = frontmatter[prop].split(',')
        if (keys.length > 1) {
          // The user decided to split the tags by comma
          frontmatter[prop] = keys.map((tag: string) => tag.trim())
        } else {
          frontmatter[prop] = [frontmatter[prop]]
        }
      } else if (!Array.isArray(frontmatter[prop])) {
        // It's likely a Number or a Boolean
        frontmatter[prop] = [String(frontmatter[prop]).toString()]
      }

      // If the user decides to use just numbers for the keywords (e.g. #1997),
      // the YAML parser will obviously cast those to numbers, but we don't want
      // this, so forcefully cast everything to string (see issue #1433).
      const sanitizedKeywords = frontmatter[prop].map((tag: any) => String(tag).toString())
      tags = tags.concat(sanitizedKeywords).map(tag => tag.toLowerCase())
    }
  }

  return [...new Set(tags)]
}
