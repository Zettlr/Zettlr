/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        md2ast
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This utility function produces reproducible conversions of
 *                  Markdown text as it is supported by Zettlr into an AST
 *                  version produced by re:mark.
 *
 * END HEADER
 */

import { remark } from 'remark'
import { Root } from 'mdast' // NOTE: Dependency of remark, not in package.json
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'

export function md2ast (markdown: string): Root {
  return remark()
    .use(remarkFrontmatter, [
      // Either Pandoc-style frontmatters ...
      { type: 'yaml', fence: { open: '---', close: '...' } },
      // ... or Jekyll/Static site generators-style frontmatters.
      { type: 'yaml', fence: { open: '---', close: '---' } }
    ])
    .use(remarkMath)
    .parse(markdown)
}
