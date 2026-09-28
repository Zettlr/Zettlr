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
  {
    description: 'Keeps literal curly braces at the end of a table cell',
    input: `| Field | Notes |
|---|---|
| Status | One of {Active, Pending Approval, Removed} |`,
    output: `<table>
<thead>
<tr>
<th> Field</th>
<th> Notes</th>
</tr>
</thead>
<tr>
<td> Status</td>
<td> One of {Active, Pending Approval, Removed}</td>
</tr>
</table>`
  },
  {
    description: 'Keeps literal curly braces at the end of a paragraph',
    input: 'Status One of {Active, Pending Approval, Removed}',
    output: '<p>Status One of {Active, Pending Approval, Removed}</p>'
  },
  {
    description: 'Treats the shorthand {-} like {.unnumbered}',
    input: '# Heading {-}',
    output: '<h1 class="unnumbered"> Heading </h1>'
  },
  {
    description: 'Escapes double quotes from single-quoted attribute values',
    input: "# H {key='a\"b'}",
    output: '<h1 key="a&quot;b"> H </h1>'
  },
  {
    description: 'Keeps braces with an unterminated single quote literal',
    input: "Text {key='x y}",
    output: "<p>Text {key='x y}</p>"
  },
  {
    description: 'Accepts a class, a single-quoted value, and {-} together',
    input: "# H {.a key='x y' -}",
    output: '<h1 class="a unnumbered" key="x y"> H </h1>'
  },
  {
    description: 'Keeps long unquoted-value lookalikes literal without backtracking',
    input: 'Text {' + 'a='.repeat(40) + '"}',
    output: '<p>Text {' + 'a='.repeat(40) + '"}</p>'
  },
  {
    description: 'Treats {--} like {-}, as Pandoc does',
    input: '# Heading {--}',
    output: '<h1 class="unnumbered"> Heading </h1>'
  },
  {
    description: 'Accepts attributes without whitespace between them',
    input: '# H {-.a#b}',
    output: '<h1 id="b" class="unnumbered a"> H </h1>'
  },
  {
    description: 'Keeps the raw-format syntax {=html} literal outside code',
    input: 'Some text {=html}',
    output: '<p>Some text {=html}</p>'
  },
  {
    description: 'Keeps consuming empty Pandoc attribute braces {}',
    input: 'Some text {}',
    output: '<p>Some text </p>'
  },
]

describe('MarkdownAST#md2HTML()', function () {
  for (const test of tests) {
    it(`should: ${test.description}`, async () => {
      deepStrictEqual(test.output, await md2html(test.input, parserOptions))
    })
  }
})
