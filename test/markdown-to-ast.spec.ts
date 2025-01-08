/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown AST Test
 * CVM-Role:        Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { deepStrictEqual } from "assert"
import { markdownToAST } from "source/common/modules/markdown-utils"
import { ASTNode } from "source/common/modules/markdown-utils/markdown-ast"

const TESTERS: Array<{ input: string, output: ASTNode }> = [
  {
    input: `|  | Not empty |
|--|--|
|No padding|  More padding  |`,
    output: {
      type: 'Generic', name: 'Document', from: 0, to: 54, whitespaceBefore: '',
      children: [
        {
          type: 'Table', name: 'Table', from: 0, to: 54, whitespaceBefore: '',
          tableType: 'pipe', alignment: [ 'left', 'left' ],
          rows: [
            {
              type: 'TableRow', name: 'TableHeader', from: 0, to: 16, whitespaceBefore: '', isHeaderOrFooter: true,
              cells: [
                { // Empty cell
                  type: 'TableCell', name: 'th', from: 2, to: 2, whitespaceBefore: '', textContent: '',
                  children: []
                },
                { // Regular (non-empty) cell
                  type: 'TableCell', name: 'th', from: 5, to: 14, whitespaceBefore: '', textContent: 'Not empty',
                  children: [{ type: 'Text', name: 'text', from: 5, to: 14, value: 'Not empty', whitespaceBefore: ' ' }]
                }
              ]
            },
            {
              type: 'TableRow', name: 'TableRow', from: 25, to: 54, whitespaceBefore: '', isHeaderOrFooter: false,
              cells: [
                { // No padding
                  type: 'TableCell', name: 'td', from: 26, to: 36, whitespaceBefore: '', textContent: 'No padding',
                  children: [{ type: 'Text', name: 'text', from: 26, to: 36, value: 'No padding', whitespaceBefore: '' }]
                },
                { // More padding
                  type: 'TableCell', name: 'td', from: 39, to: 51, whitespaceBefore: '', textContent: 'More padding',
                  children: [{ type: 'Text', name: 'text', from: 39, to: 51, value: 'More padding', whitespaceBefore: '  ' }]
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    input: `# Image file

This iss a *file* with two tpyos in here. asdaa *ss* adas word word.`,
    output: {
      type: 'Generic',
      name: 'Document',
      from: 0,
      to: 82,
      whitespaceBefore: '',
      children: [
        {
          type: 'Heading',
          name: 'ATXHeading1',
          from: 0,
          to: 12,
          whitespaceBefore: '',
          content: 'Image file',
          children: [
            { type: 'Generic', name: 'HeaderMark', from: 0, to: 1, children: [], whitespaceBefore: '' },
            { type : 'Text', name: 'text', from: 2, to: 12, value: 'Image file', whitespaceBefore: ' ' }
          ],
          level: 1
        },
        {
          type: 'Generic',
          name: 'Paragraph',
          from: 14,
          to: 82,
          whitespaceBefore: '\n\n',
          children: [
            { type: 'Text', name: 'text', from: 14, to: 25, value: 'This iss a ', whitespaceBefore: '' },
            {
              type: 'Emphasis',
              name: 'Emphasis',
              which: 'italic',
              from: 25,
              to: 31,
              whitespaceBefore: ' ',
              children: [
                { type: 'Generic', name: 'EmphasisMark', from: 25, to: 26, whitespaceBefore: '', children: [] },
                { type: 'Text', name: 'text', from: 26, to: 30, value: 'file', whitespaceBefore: '' },
                { type: 'Generic', name: 'EmphasisMark', from: 30, to: 31, whitespaceBefore: '', children: [] }
              ]
            },
            { type: 'Text', name: 'text', from: 32, to: 62, value: 'with two tpyos in here. asdaa ', whitespaceBefore: ' ' },
            {
              type: 'Emphasis',
              name: 'Emphasis',
              which: 'italic',
              from: 62,
              to: 66,
              whitespaceBefore: ' ',
              children: [
                { type: 'Generic', name: 'EmphasisMark', from: 62, to: 63, whitespaceBefore: '', children: [] },
                { type: 'Text', name: 'text', from: 63, to: 65, value: 'ss', whitespaceBefore: '' },
                { type: 'Generic', name: 'EmphasisMark', from: 65, to: 66, whitespaceBefore: '', children: [] }
              ]
            },
            { type: 'Text', name: 'text', from: 67, to: 82, value: 'adas word word.', whitespaceBefore: ' ' }
          ]
        }
      ]
    }
  }
]

describe('MarkdownAST#markdownToAST()', function () {
  for (const test of TESTERS) {
    // TODO: This test currently fails. This is not yet a problem, but we have
    // to decide what to do. Specifically, currently the AST parser spits out
    // TableDelimiters as their own nodes. Do we want that or not?
    // console.log(util.inspect(markdownToAST(test.input), { colors: true, depth: null }))
    it('should parse the Markdown properly', () => {
      deepStrictEqual(test.output, markdownToAST(test.input))
    })
  }
})
