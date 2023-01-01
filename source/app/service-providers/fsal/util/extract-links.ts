/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractLinks
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function extracts outlinks from a Markdown string
 *
 * END HEADER
 */

import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'

export default function extractLinks (markdown: string): string[] {
  const links: string[] = []

  const { content } = extractYamlFrontmatter(markdown)

  // Any link must be inline, so let's just split into lines
  const lines = content.split(/[\r\n]+/g)
  for (const line of lines) {
    // I think this is the first time I've used a for-loop like this
    for (let pos = 0; line.includes('[[', pos);) {
      // We need to increase the pos right away
      pos = line.indexOf('[[', pos) + 2
      // Find a potential end
      if (line.includes(']]', pos)) {
        links.push(line.substring(pos, line.indexOf(']]', pos)))
      } else {
        break // No more complete links in this line
      }
    }
  }

  return links
}
