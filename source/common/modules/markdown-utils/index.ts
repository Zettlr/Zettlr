/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown Utilities
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the main entry file for various Markdown utilities
 *                  needed throughout the app.
 *
 * END HEADER
 */

import markdownParser from '@common/modules/markdown-editor/parser/markdown-parser'
import { ASTNode, parseNode, TextNode } from './markdown-ast'

export { md2html } from './markdown-to-html'

/**
 * Converts a Markdown string into an AST, utilizing the CodeMirror Markdown
 * parser for the heavy lifting. This effectively takes a Lezer tree and
 * converts it to a custom Markdown AST implementation.
 *
 * @param   {string}   markdown  The Markdown source
 *
 * @return  {ASTNode}            The root node of the AST
 */
export function markdownToAST (markdown: string): ASTNode {
  const { parser } = markdownParser().language
  const tree = parser.parse(markdown)
  const ast = parseNode(tree.topNode, markdown)
  return ast
}

/**
 * Extracts all text nodes from a Markdown AST. Can be used for spellchecking,
 * for example. An optional filter can be provided to exclude text nodes from
 * those nodes that should not be extracted.
 *
 * @param   {ASTNode[]}   ast     The AST root.
 * @param   {Function}    filter  A function that receives an ASTNode and should
 *                                return false if the node should be excluded.
 *
 * @return  {TextNode[]}          A list of all text nodes
 */
export function extractTextnodes (ast: ASTNode, filter?: (node: ASTNode) => boolean): TextNode[] {
  if (filter !== undefined && !filter(ast)) {
    return []
  }

  let textNodes: TextNode[] = []
  if (ast.type === 'Text') {
    textNodes.push(ast)
  } else if (ast.type === 'Heading' || ast.type === 'Citation') {
    textNodes.push(ast.value)
  } else if (ast.type === 'FootnoteRef' || ast.type === 'Highlight' || ast.type === 'ListItem') {
    for (const child of ast.children) {
      textNodes = textNodes.concat(extractTextnodes(child, filter))
    }
  } else if (ast.type === 'Image' || ast.type === 'Link') {
    textNodes.push(ast.alt)
    textNodes.push(ast.url)
    if (ast.title !== undefined) {
      textNodes.push(ast.title)
    }
  } else if (ast.type === 'List') {
    for (const item of ast.items) {
      textNodes = textNodes.concat(extractTextnodes(item, filter))
    }
  } else if (ast.type === 'Generic' || ast.type === 'Emphasis') {
    for (const child of ast.children) {
      textNodes = textNodes.concat(extractTextnodes(child, filter))
    }
  } else if (ast.type === 'Table') {
    for (const row of ast.rows) {
      for (const cell of row.cells) {
        textNodes = textNodes.concat(extractTextnodes(cell, filter))
      }
    }
  }
  return textNodes
}
