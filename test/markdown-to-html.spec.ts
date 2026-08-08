/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown AST to HTML Test
 * CVM-Role:        Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { deepStrictEqual } from "assert"
import { md2html } from "source/common/modules/markdown-utils"
import { MD2HTMLOptions } from "source/common/modules/markdown-utils/markdown-to-html"

const parserOptions: MD2HTMLOptions = {
  zknLinkFormat: 'link|title',
  onCitation (citations, composite) {
    return '[' + citations.map(i => '@' + i.id).join('; ') + ']'
  },
}

// NOTE: I have only devised these tests to visualize what the parser will do.
// There is lots to do to make the HTML look nicer.
const tests: Array<{ description: string, input: string, output: string }> = [
  {
    description: 'Turns Markdown to HTML',
    input: 'This is a **test** sentence.',
    output: '<p>This is a  <strong>test</strong> sentence.</p>'
  },
  {
    description: 'Turns Markdown to HTML',
    input: `# This is a heading

And some text.`,
    output: `<h1> This is a heading</h1>

<p>

And some text.</p>`
  },
  {
    description: 'Turns Markdown to HTML',
    input: `# Blockquote

> This is a blockquote.`,
    output: `<h1> Blockquote</h1>

<blockquote> <p> This is a blockquote.</p></blockquote>`
  },
  {
    description: 'Turns Markdown to HTML',
    input: `# Admonition

> [!note] This is a custom note
> Hi there, this is a note.`,
    output: `<h1> Admonition</h1>

<div class="admonition note"><div class="admonition-title">This is a custom note</div> <p> Hi there, this is a note.</p></div>`
  },
]

describe('MarkdownAST#md2HTML()', function () {
  for (const test of tests) {
    it(`should: ${test.description}`, async () => {
      console.log(await md2html(test.input, parserOptions))
      deepStrictEqual(test.output, await md2html(test.input, parserOptions))
    })
  }
})
