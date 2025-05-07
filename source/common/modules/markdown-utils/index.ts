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

import markdownParser, { type MarkdownParserConfig } from '@common/modules/markdown-editor/parser/markdown-parser'
import { parseNode, type ASTNode, type ASTNodeType, type TextNode } from './markdown-ast'
import { type Tree } from '@lezer/common'

export { md2html } from './markdown-to-html'

/**
 * Converts a Markdown string into an AST, utilizing the CodeMirror Markdown
 * parser for the heavy lifting. This effectively takes a Lezer tree and
 * converts it to a custom Markdown AST implementation.
 *
 * @param   {string}   markdown  The Markdown source
 * @param   {Tree}     tree      Optional: If you already have a parsed tree,
 *                               you can pass it here to save some time re-
 *                               parsing the source. Please NOTE: If you pass in
 *                               a tree, you MUST pass the full Markdown source
 *                               that has been used to generate the parse tree,
 *                               since otherwise the offsets in the parse tree
 *                               will be wrong!
 *
 * @return  {ASTNode}            The root node of the AST
 */
export function markdownToAST (markdown: string, tree?: Tree, parserConfig?: MarkdownParserConfig): ASTNode {
  if (tree === undefined) {
    const { parser } = markdownParser(parserConfig).language
    tree = parser.parse(markdown)
  }
  const ast = parseNode(tree.topNode, markdown)
  return ast
}

/**
 * Extracts arbitrary AST nodes. Providing a NodeType that is not used within
 * the AST will return an empty array.
 *
 * @param   {ASTNode}      ast       The AST to extract nodes from
 * @param   {ASTNodeType}  nodeType  The Node type to query
 * @param   {Function}     filter    An optional filter. Receives a node and
 *                                   returns a boolean indicating if the node
 *                                   should be visited.
 *
 * @return  {ASTNode[]}              An array of all found nodes
 */
export function extractASTNodes (ast: ASTNode, nodeType: ASTNodeType, filter?: (node: ASTNode) => boolean): ASTNode[] {
  if (filter !== undefined && !filter(ast)) {
    return []
  }

  if (ast.type === nodeType) {
    return [ast]
  } else if (ast.type === 'FootnoteRef' || ast.type === 'Highlight' || ast.type === 'ListItem' || ast.type === 'Generic' || ast.type === 'Emphasis') {
    let returnNodes: ASTNode[] = []
    for (const child of ast.children) {
      returnNodes = returnNodes.concat(extractASTNodes(child, nodeType, filter))
    }
    return returnNodes
  } else if (ast.type === 'OrderedList' || ast.type === 'BulletList') {
    let returnNodes: ASTNode[] = []
    for (const item of ast.items) {
      returnNodes = returnNodes.concat(extractASTNodes(item, nodeType, filter))
    }
    return returnNodes
  } else if (ast.type === 'Table') {
    let returnNodes: ASTNode[] = []
    for (const row of ast.rows) {
      for (const cell of row.cells) {
        returnNodes = returnNodes.concat(cell.children.flatMap(c => extractASTNodes(c, nodeType, filter)))
      }
    }
    return returnNodes
  } else {
    return []
  }
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
  } else if (ast.type === 'Heading' || ast.type === 'FootnoteRef' || ast.type === 'Highlight' || ast.type === 'ListItem') {
    for (const child of ast.children) {
      textNodes = textNodes.concat(extractTextnodes(child, filter))
    }
  } else if (ast.type === 'Image' || ast.type === 'Link') {
    textNodes.push(ast.alt)
    if (ast.title !== undefined) {
      textNodes.push(ast.title)
    }
  } else if (ast.type === 'OrderedList' || ast.type === 'BulletList') {
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
        const nodes = cell.children.flatMap(c => extractTextnodes(c, filter))
        textNodes = textNodes.concat(nodes)
      }
    }
  }
  return textNodes
}
