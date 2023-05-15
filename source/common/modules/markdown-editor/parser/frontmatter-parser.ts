/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Frontmatter Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This block parser adds YAML frontmatter syntax tags.
 *
 * END HEADER
 */

import { type BlockParser } from '@lezer/markdown'
import { StreamLanguage } from '@codemirror/language'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { partialParse } from './partial-parse'

const yamlLang = StreamLanguage.define(yaml)

// TODO: Docs for this: https://github.com/lezer-parser/markdown#user-content-blockparser
export const frontmatterParser: BlockParser = {
  // We need to give the parser a name. Since it should only parse YAML frontmatters,
  // here we go.
  name: 'frontmatter',
  // It must run before the HorizontalRule block parser since the delimiters
  // can also be interpreted as horizontal rules.
  before: 'HorizontalRule',
  parse: (ctx, line) => {
    // This parser is inspired by the BlockParsers defined in
    // @lezer/markdown/src/markdown.ts
    if (line.text !== '---' || ctx.lineStart !== 0) {
      return false
    }

    // We have a possible YAML frontmatter. Now we need to look for the end of
    // the frontmatter (i.e. look for a line that is either --- or ...).
    // Meanwhile, we'll be collecting all lines encountered so that we can parse
    // them into a YAML AST.
    const yamlLines: string[] = []
    // We also need the position at which the (actual) frontmatter starts
    const from = 4
    while (ctx.nextLine() && !/^(?:-{3}|\.{3})$/.test(line.text)) {
      yamlLines.push(line.text)
    }

    if (!/^(?:-{3}|\.{3})$/.test(line.text)) {
      // The parser has collected the full rest of the document. This means
      // the frontmatter never stopped. In order to maintain readability, we
      // simply abort parsing.
      return false
    }

    if (yamlLines.length === 0) {
      return false // A frontmatter must have content
    }

    // A final check: A frontmatter is NOT a valid document if there is
    // whitespace at the top (i.e. no blank lines between the delimiters and the
    // frontmatter content). NOTE: Whitespace AFTER the frontmatter content is
    // allowed!
    if (yamlLines[0].trim() === '') {
      return false
    }

    // At this point we have a correct and full YAML frontmatter, we know where
    // it starts and we know where it ends. In order to simplify creating the
    // required AST, we defer to letting the YAML parser parse this thing into
    // a tree that we can then simply convert into the format consumed by
    // Codemirror.
    const treeElem = partialParse(ctx, yamlLang.parser, yamlLines.join('\n'), from)

    const wrapperNode = ctx.elt('FencedCode', 0, ctx.lineStart + 3, [
      ctx.elt('YAMLFrontmatterStart', 0, 3),
      ctx.elt('CodeText', 4, ctx.lineStart - 1, [treeElem]),
      ctx.elt('YAMLFrontmatterEnd', ctx.lineStart, ctx.lineStart + 3)
    ])

    // Now that we are certain that we have a frontmatter, we must "consume" the
    // final line of the frontmatter so that the HorizontalRule parser cannot
    // detect this as a HorizontalRule (if the frontmatter ends with ---)
    ctx.nextLine()

    ctx.addElement(wrapperNode)
    return true // Signal that we've parsed this block
  }
}
