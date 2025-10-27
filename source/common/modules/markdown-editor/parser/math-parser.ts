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

import type { DelimiterType, InlineParser, BlockParser } from '@lezer/markdown'
import { StreamLanguage } from '@codemirror/language'
import { stexMath } from '@codemirror/legacy-modes/mode/stex'

const stexLang = StreamLanguage.define(stexMath)

const MathDelimiter: DelimiterType = {}

export const inlineMathParser: InlineParser = {
  // This parser should only match inline-math (we have to divide that here)
  name: 'inlineMath',
  parse: (ctx, next, pos) => {
    if (next !== 36) { // 36 === '$'
      return -1
    }

    // Try to find an opening delimiter
    let opening = ctx.findOpeningDelimiter(MathDelimiter)

    // Since there was no opening, this is a potential opening
    if (opening === null) {
      return ctx.addDelimiter(MathDelimiter, pos, pos + 1, true, false)
    }

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) { return -1 }

    // Remove any elements that were parsed internally
    ctx.takeContent(opening)

    ctx.addDelimiter(MathDelimiter, pos, pos + 1, false, true)

    const contents = ctx.slice(delim.to, pos)
    // Parse the interior content using stex
    const innerElements = ctx.elt(stexLang.parser.parse(contents), delim.to)

    const openingMark = ctx.elt('CodeMark', delim.from, delim.to)
    const closingMark = ctx.elt('CodeMark', pos, pos + 1)

    return ctx.addElement(ctx.elt('InlineCode', delim.from, pos + 1, [ openingMark, innerElements, closingMark ]))
  }
}

export const blockMathParser: BlockParser = {
  name: 'blockMath',
  parse: (ctx, line) => {
    const blockMathRE = /^(\s*\$\$)\s*$/
    if (!blockMathRE.test(line.text)) {
      return false
    }

    const equationLines: string[] = []

    const blockStart = ctx.lineStart
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

    // Parse the interior content using stex
    const innerElements = ctx.elt(stexLang.parser.parse(equationLines.join('\n')), from)
    const codeText = ctx.elt('CodeText', from, ctx.prevLineEnd(), [innerElements])

    const openingMark = ctx.elt('CodeMark', blockStart, from - 1)
    const closingMark = ctx.elt('CodeMark', ctx.lineStart, ctx.lineStart + line.text.length)

    ctx.addElement(ctx.elt('FencedCode', blockStart, ctx.lineStart + line.text.length, [ openingMark, codeText, closingMark ]))
    ctx.nextLine()

    return true
  }
}
