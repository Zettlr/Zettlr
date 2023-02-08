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
import { Root, Parent, Text } from 'mdast' // NOTE: Dependency of remark, not in package.json
import remarkFrontmatter from 'remark-frontmatter'
import remarkMath from 'remark-math'

/**
 * This is a DEBUG function used until issue #5 at micromark-extension-frontmatter is fixed
 *
 * @param   {string}  md  The original Markdown
 *
 * @return  {string}      The new Markdown with Pandoc frontmatters normalized to Jekyll-style
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
function __DEBUG__normalizeFrontmatter (md: string): string {
  const eol = md.includes('\r\n')
    ? '\r\n'
    : md.includes('\n\r') ? '\n\r' : '\n'

  if (!md.startsWith(`---${eol}`)) {
    return md // No frontmatter, nothing to do
  }

  const lines = md.split(eol)

  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      return md // We first found a correct frontmatter, so nothing to do
    } else if (lines[i] === '...') {
      // Pandoc style ending, so exchange and return normalized frontmatter
      lines[i] = '---'
      return lines.join(eol)
    }
  }

  return md
}

export function md2ast (markdown: string): Root {
  return remark()
    .use(remarkFrontmatter, [
      // Either Pandoc-style frontmatters ...
      // DEBUG: See issue https://github.com/micromark/micromark-extension-frontmatter/issues/5
      // { type: 'yaml', fence: { open: '---', close: '...' } },
      // ... or Jekyll/Static site generators-style frontmatters.
      { type: 'yaml', fence: { open: '---', close: '---' } }
    ])
    .use(remarkMath)
    .parse(__DEBUG__normalizeFrontmatter(markdown))
}

/**
* Returns just the text nodes from a string of Markdown, using mdast
*
* @param   {string|Parent}  input  Either Markdown string or an AST element (only)
*
* @return  {Text[]}            A set of text nodes (including their positions)
*/
export function extractTextnodes (input: string|Parent): Text[] {
  const ast = (typeof input === 'string') ? md2ast(input) : input
  const textNodes: Text[] = []
  // NOTE: We're dealing with an mdast, not the CodeMirror Markdown mode one!
  const ignoreBlocks = [ 'code', 'math' ]

  for (const child of ast.children) {
    if (ignoreBlocks.includes(child.type)) {
      continue // Ignore non-text blocks
    }

    if ('children' in child && Array.isArray(child.children)) {
      textNodes.push(...extractTextnodes(child)) // Text nodes cannot have children
    } else if (child.type === 'text') {
      // Only spit out text nodes
      textNodes.push(child)
    }
  }

  return textNodes
}
