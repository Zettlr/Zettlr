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

const blockMathRE = /^(\s*\$\$)\s*$/
const blankLineRe = /^\s*$/

export const inlineMathParser: InlineParser = {
  // This parser should only match inline-math (we have to divide that here)
  name: 'inlineMath',
  parse: (ctx, next, pos) => {
    if (next !== 36) { // 36 === '$'
      return -1
    }

    // Even though double dollars mark a display equation, it is perfectly
    // within spec to keep it inline (it will be rendered as a block element).
    // Since this technically (from the parser's perspective) makes this an
    // inline-element, we implement this check here, and not in the block parser
    // below.
    const isInlineDisplayMath = ctx.char(pos + 1) === 36
    const delimLength = isInlineDisplayMath ? 2 : 1

    // Try to find an opening delimiter
    const opening = ctx.findOpeningDelimiter(MathDelimiter)

    // Since there was no opening delimiter, this is a potential opening
    if (opening === null) {
      // Inline opening delimiters cannot be followed by a space, but display math delimiters can
      const invalidOpening = !isInlineDisplayMath && /\s/.test(ctx.slice(pos + 1, pos + 2))

      // Either return -1 due to an invalid delimiter, or return the end position of the delimiter
      return  invalidOpening ? -1 : ctx.addDelimiter(MathDelimiter, pos, pos + delimLength, true, false)
    }

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) {
      return -1
    }

    // Ensure the opening and closing delimiters are the same length
    if (delim.to - delim.from !== delimLength) {
      return -1
    }

    // Inline closing delimiters cannot be preceded by a space or followed by a digit, but display math delimiters can
    if (!isInlineDisplayMath && (/\s/.test(ctx.slice(pos - 1, pos)) || /\d/.test(ctx.slice(pos + 1, pos + 2)))) {
      // However, if this is an invalid closing delimiter, we need to check if
      // it would be a valid  opening delimiter and add it to the tree if it is.
      const invalidOpening = /\s/.test(ctx.slice(pos + 1, pos + 2))

      // Either return -1 due to an invalid delimiter, or return the end position of the delimiter
      return  invalidOpening ? -1 : ctx.addDelimiter(MathDelimiter, pos, pos + delimLength, true, false)
    }

    // Remove any elements that were parsed internally
    ctx.takeContent(opening)

    ctx.addDelimiter(MathDelimiter, pos, pos + delimLength, false, true)

    const contents = ctx.slice(delim.to, pos)
    // Parse the interior content using stex
    const innerElements = ctx.elt(stexLang.parser.parse(contents), delim.to)

    const openingMark = ctx.elt('CodeMark', delim.from, delim.to)
    const closingMark = ctx.elt('CodeMark', pos, pos + delimLength)

    return ctx.addElement(ctx.elt('InlineCode', delim.from, pos + delimLength, [ openingMark, innerElements, closingMark ]))
  }
}

export const blockMathParser: BlockParser = {
  name: 'blockMath',
  parse: (ctx, line) => {
    if (!blockMathRE.test(line.text)) {
      return false
    }

    const equationLines: string[] = []

    const blockStart = ctx.lineStart
    const from = ctx.lineStart + line.text.length + 1

    while (ctx.nextLine()) {
      if (blankLineRe.test(line.text) || blockMathRE.test(line.text)) {
        break
      }

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
