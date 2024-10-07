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
    input: `|  |  |
|--|--|
|  |  |`,
    output: {
      type: 'Generic', name: 'Document', from: 0, to: 23, whitespaceBefore: '',
      children: [
        {
          type: 'Table', name: 'Table', from: 0, to: 23, whitespaceBefore: '',
          tableType: 'pipe', alignment: [ 'left', 'left' ],
          rows: [
            {
              type: 'TableRow', name: 'TableHeader', from: 0, to: 7, whitespaceBefore: '', isHeaderOrFooter: true,
              cells: [
                {
                  type: 'TableCell', name: 'TableCell', from: 1, to: 3, whitespaceBefore: '', textContent: '  ',
                  children: [{ type: 'Text', name: 'text', from: 1, to: 3, value: '  ', whitespaceBefore: '' }]
                },
                {
                  type: 'TableCell', name: 'TableCell', from: 4, to: 6, whitespaceBefore: '', textContent: '  ',
                  children: [{ type: 'Text', name: 'text', from: 4, to: 6, value: '  ', whitespaceBefore: '' }]
                }
              ]
            },
            {
              type: 'TableRow', name: 'TableRow', from: 16, to: 23, whitespaceBefore: '', isHeaderOrFooter: false,
              cells: [
                {
                  type: 'TableCell', name: 'TableCell', from: 17, to: 19, whitespaceBefore: '', textContent: '  ',
                  children: [{ type: 'Text', name: 'text', from: 17, to: 19, value: '  ', whitespaceBefore: '' }]
                },
                {
                  type: 'TableCell', name: 'TableCell', from: 20, to: 22, whitespaceBefore: '', textContent: '  ',
                  children: [{ type: 'Text', name: 'text', from: 20, to: 22, value: '  ', whitespaceBefore: '' }]
                }
              ]
            }
          ]
        }
      ]
    }
  }
]

describe('MarkdownAST#markdownToAST()', function () {
  for (const test of TESTERS) {
    console.log(markdownToAST(test.input))
    it('should parse the Markdown properly', () => {
      deepStrictEqual(test.output, markdownToAST(test.input))
    })
  }
})
