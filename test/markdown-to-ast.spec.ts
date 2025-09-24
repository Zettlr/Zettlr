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

const TESTERS: Array<{ description: string, input: string, output: ASTNode }> = [
  {
    description: 'Parse pipe table correctly',
    input: `|  | Not empty |
|--|--|
|No padding|  More padding  |`,
    output: {
      type: 'Generic', name: 'Document', from: 0, to: 54, whitespaceBefore: '',
      children: [
        {
          type: 'Table', name: 'Table', from: 0, to: 54, whitespaceBefore: '',
          tableType: 'pipe', alignment: [ null, null ],
          rows: [
            {
              type: 'TableRow', name: 'TableHeader', from: 0, to: 16, whitespaceBefore: '', isHeaderOrFooter: true,
              cells: [
                { // Empty cell
                  type: 'TableCell', name: 'th', from: 2, to: 2, whitespaceBefore: '', textContent: '',
                  padding: { from: 1, to: 3 },
                  children: [], attributes: {}
                },
                { // Regular (non-empty) cell
                  type: 'TableCell', name: 'th', from: 5, to: 14, whitespaceBefore: '', textContent: 'Not empty',
                  padding: { from: 4, to: 15 },
                  children: [{ type: 'Text', name: 'text', from: 5, to: 14, value: 'Not empty', whitespaceBefore: ' ', attributes: {} }], attributes: {}
                }
              ], attributes: {}
            },
            {
              type: 'TableRow', name: 'TableRow', from: 25, to: 54, whitespaceBefore: '', isHeaderOrFooter: false,
              cells: [
                { // No padding
                  type: 'TableCell', name: 'td', from: 26, to: 36, whitespaceBefore: '', textContent: 'No padding',
                  padding: { from: 26, to: 36 },
                  children: [{ type: 'Text', name: 'text', from: 26, to: 36, value: 'No padding', whitespaceBefore: '', attributes: {} }], attributes: {}
                },
                { // More padding
                  type: 'TableCell', name: 'td', from: 39, to: 51, whitespaceBefore: '', textContent: 'More padding',
                  padding: { from: 37, to: 53 },
                  children: [{ type: 'Text', name: 'text', from: 39, to: 51, value: 'More padding', whitespaceBefore: '  ', attributes: {} }], attributes: {}
                }
              ], attributes: {}
            }
          ], attributes: {}
        }
      ], attributes: {}
    }
  },
  {
    description: 'Parse a minimal pipe table correctly',
    input: `A|B
-|-
C|D`,
    output: {
      type: 'Generic', name: 'Document', from: 0, to: 11, whitespaceBefore: '',
      children: [
        {
          type: 'Table', name: 'Table', tableType: 'pipe', from: 0, to: 11, whitespaceBefore: '',
          alignment: [null, null],
          rows: [
            {
              type: 'TableRow', name: 'TableHeader', isHeaderOrFooter: true, from: 0, to: 3, whitespaceBefore: '',
              cells: [
                {
                  type: 'TableCell', name: 'th', from: 0, to: 1, padding: { from: 0, to: 1 }, whitespaceBefore: '', textContent: 'A',
                  children: [{ type: 'Text', name: 'text', from: 0, to: 1, value: 'A', whitespaceBefore: '', attributes: {} }], attributes: {}
                },
                {
                  type: 'TableCell', name: 'th', from: 2, to: 3, padding: { from: 2, to: 3 }, whitespaceBefore: '', textContent: 'B',
                  children: [{ type: 'Text', name: 'text', from: 2, to: 3, value: 'B', whitespaceBefore: '', attributes: {} }], attributes: {}
                }
              ], attributes: {}
            },
            {
              type: 'TableRow', name: 'TableRow', isHeaderOrFooter: false, from: 8, to: 11, whitespaceBefore: '',
              cells: [
                {
                  type: 'TableCell', name: 'td', from: 8, to: 9, padding: { from: 8, to: 9 }, whitespaceBefore: '', textContent: 'C',
                  children: [{ type: 'Text', name: 'text', from: 8, to: 9, value: 'C', whitespaceBefore: '', attributes: {} }], attributes: {}
                },
                {
                  type: 'TableCell', name: 'td', from: 10, to: 11, padding: { from: 10, to: 11 }, whitespaceBefore: '', textContent: 'D',
                  children: [{ type: 'Text', name: 'text', from: 10, to: 11, value: 'D', whitespaceBefore: '', attributes: {} }], attributes: {}
                }
              ], attributes: {}
            }
          ], attributes: {}
        }
      ], attributes: {}
    }
  },
  {
    description: 'Parse a regular Markdown document correctly',
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
            { type: 'Generic', name: 'HeaderMark', from: 0, to: 1, children: [], whitespaceBefore: '', attributes: {} },
            { type : 'Text', name: 'text', from: 2, to: 12, value: 'Image file', whitespaceBefore: ' ', attributes: {} }
          ],
          level: 1, attributes: {}
        },
        {
          type: 'Generic',
          name: 'Paragraph',
          from: 14,
          to: 82,
          whitespaceBefore: '\n\n',
          children: [
            { type: 'Text', name: 'text', from: 14, to: 25, value: 'This iss a ', whitespaceBefore: '', attributes: {} },
            {
              type: 'Emphasis',
              name: 'Emphasis',
              which: 'italic',
              from: 25,
              to: 31,
              whitespaceBefore: ' ',
              children: [
                { type: 'Generic', name: 'EmphasisMark', from: 25, to: 26, whitespaceBefore: '', children: [], attributes: {} },
                { type: 'Text', name: 'text', from: 26, to: 30, value: 'file', whitespaceBefore: '', attributes: {} },
                { type: 'Generic', name: 'EmphasisMark', from: 30, to: 31, whitespaceBefore: '', children: [], attributes: {} }
              ], attributes: {}
            },
            { type: 'Text', name: 'text', from: 32, to: 62, value: 'with two tpyos in here. asdaa ', whitespaceBefore: ' ', attributes: {} },
            {
              type: 'Emphasis',
              name: 'Emphasis',
              which: 'italic',
              from: 62,
              to: 66,
              whitespaceBefore: ' ',
              children: [
                { type: 'Generic', name: 'EmphasisMark', from: 62, to: 63, whitespaceBefore: '', children: [], attributes: {} },
                { type: 'Text', name: 'text', from: 63, to: 65, value: 'ss', whitespaceBefore: '', attributes: {} },
                { type: 'Generic', name: 'EmphasisMark', from: 65, to: 66, whitespaceBefore: '', children: [], attributes: {} }
              ], attributes: {}
            },
            { type: 'Text', name: 'text', from: 67, to: 82, value: 'adas word word.', whitespaceBefore: ' ', attributes: {} }
          ], attributes: {}
        }
      ], attributes: {}
    }
  }
]

describe('MarkdownAST#markdownToAST()', function () {
  for (const test of TESTERS) {
    it(`should: ${test.description}`, () => {
      deepStrictEqual(test.output, markdownToAST(test.input))
    })
  }
})
