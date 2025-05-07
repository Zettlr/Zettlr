/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        markdownToAST tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { deepStrictEqual } from 'assert'
import { markdownToAST } from '../source/common/modules/markdown-utils'
import { type ASTNode } from 'source/common/modules/markdown-utils/markdown-ast'

const tests: Array<{ input: string, expected: ASTNode }> = [
  {
    input: `# Image file

This iss a *file* with two tpyos in here. asdaa *ss* adas word word.`,
    expected: {
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
  for (const test of tests) {
    it('should correctly parse the Markdown source', function () {
      const ast = markdownToAST(test.input)
      deepStrictEqual(ast, test.expected)
    })
  }
})
