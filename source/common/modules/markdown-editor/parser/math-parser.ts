/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Math Parser
 * CVM-Role:        InlineParser, BlockParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module provides an inline and a block parser for both
 *                  inline and block math.
 *
 * END HEADER
 */

import { type InlineParser, type BlockParser } from '@lezer/markdown'
import { StreamLanguage } from '@codemirror/language'
import { Tree } from '@lezer/common'
import { stexMath } from '@codemirror/legacy-modes/mode/stex'
import { partialParse } from './partial-parse'

const stexLang = StreamLanguage.define(stexMath)

export const inlineMathParser: InlineParser = {
  // This parser should only match inline-math (we have to divide that here)
  name: 'inlineMath',
  parse: (ctx, next, pos) => {
    if (next !== 36) { // $
      return -1
    }

    const inlineMathRE = /(?<![\\$])(?<dollar>\${1,2})(?![\s$])(?<eq>.+?)(?<![\s\\])\k<dollar>(?!\d)/g
    // Set the lastIndex to the relative position where we're currently parsing ...
    const relativePosition = pos - ctx.offset
    inlineMathRE.lastIndex = relativePosition

    // .. attempt a match ...
    const match = inlineMathRE.exec(ctx.text)
    // ... check that we had one, and that it is at the very start of the string ...
    if (match === null || match.index > relativePosition) {
      return -1 // There was either no match, or we're not yet there
    }

    // ... and work through the match.
    const { eq, dollar } = match.groups as Record<string, string>

    let curPos = pos
    const childNodes = [ctx.elt('CodeMark', curPos, curPos + dollar.length)]

    curPos += dollar.length
    const treeElem = partialParse(ctx, stexLang.parser, eq, curPos)
    childNodes.push(treeElem)

    curPos += eq.length
    childNodes.push(ctx.elt('CodeMark', curPos, curPos + dollar.length))
    const wrapperElem = ctx.elt('InlineCode', pos, curPos + dollar.length, childNodes)
    return ctx.addElement(wrapperElem)
  }
}

export const blockMathParser: BlockParser = {
  // We need to give the parser a name. Since it should only parse YAML frontmatters,
  // here we go.
  name: 'blockMath',
  parse: (ctx, line) => {
    const blockMathRE = /^(\s*\$\$)\s*$/
    // This parser is inspired by the BlockParsers defined in
    // @lezer/markdown/src/markdown.ts
    if (!blockMathRE.test(line.text)) {
      return false
    }

    // We have a possible math block
    const equationLines: string[] = []
    // We also need the position at which the block ends
    const startFrom = ctx.lineStart
    const from = ctx.lineStart + line.text.length + 1
    while (ctx.nextLine() && !blockMathRE.test(line.text)) {
      equationLines.push(line.text)
    }

    if (!blockMathRE.test(line.text)) {
      // The parser has collected the full rest of the document. This means
      // the math block never stopped. In order to maintain readability, we
      // simply abort parsing.
      return false
    }

    // Let the stex mode parse the block into a tree and create a new element
    // from that tree.
    const equation = equationLines.join('\n')
    const innerTree = stexLang.parser.parse(equation)

    // Here we detach the syntax tree from the containing `Document` node
    const firstChild = innerTree.children[0]
    let treeElem = ctx.elt(innerTree, from)
    if (firstChild instanceof Tree) {
      treeElem = ctx.elt(firstChild, from)
    }

    // Now create the wrapper
    const wrapperNode = ctx.elt('FencedCode', startFrom, ctx.lineStart + line.text.length, [
      ctx.elt('CodeMark', startFrom, from - 1), // Ignore the newline char (to ensure the math renderer can differentiate math blocks from code blocks)
      ctx.elt('CodeText', from, from + equation.length, [treeElem]),
      ctx.elt('CodeMark', Math.max(from + equation.length, ctx.lineStart), ctx.lineStart + line.text.length)
    ])

    ctx.addElement(wrapperNode)

    // Ensure the closing code mark is also contained within this block. NOTE:
    // Needs to be done AFTER we have used the line info to create the widget!
    ctx.nextLine()
    return true // Signal that we've parsed this block
  }
}
