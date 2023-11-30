/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Partial Parse
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Given a parser function, this utility function renders a
 *                  document part and returns the partial tree for that part.
 *
 * END HEADER
 */

import { type Parser, Tree } from '@lezer/common'
import { type BlockContext, type InlineContext, type Element } from '@lezer/markdown'

/**
 * This function parses the given `text` using a `parser` of your choice and
 * returns an `Element` that you can attach to a @lezer/markdown tree. This
 * helps if you need to parse a piece of text inside a document with a known
 * language but have to wrap it into some custom element. NOTE: Only to be used
 * within a block or inline parser within the main Markdown parser!
 *
 * @param   {BlockContext|InlineContext}  ctx     The context
 * @param   {Parser}                      parser  Either a Lezer parser or a
 *                                                StreamParser
 * @param   {string}                      text    The text to be parsed
 * @param   {number}                      offset  The offset in the document
 *                                                where `text` begins
 *
 * @return  {Element}                             A detached child tree for you
 *                                                to hook up.
 */
export function partialParse (ctx: BlockContext|InlineContext, parser: Parser, text: string, offset: number): Element {
  const innerTree = parser.parse(text)
  // Here we detach the syntax tree from the containing `Document` node, since
  // a parser expects that it needs to parse a full document. However, a child
  // `Document` element may or may not cause problems so we take it off its
  // root here.
  let treeElem = ctx.elt(innerTree, offset)
  const firstChild = innerTree.children[0]
  if (firstChild instanceof Tree) {
    treeElem = ctx.elt(firstChild, offset)
  }

  return treeElem
}
