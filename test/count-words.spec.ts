/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Counter tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { markdownToAST } from '@common/modules/markdown-utils'
import { countChars, countWords } from '../source/common/util/counter'
import { strictEqual } from 'assert'

const countWordsTesters = [
  {
    input: '',
    expectedWords: 0,
    expectedChars: 0
  },
  {
    input: 'Lorem\n\n# Ipsum',
    expectedWords: 2,
    expectedChars: 10
  },
  {
    input: 'Lorem\n\n# Ipsum Dolor',
    expectedWords: 3,
    expectedChars: 15
  },
  {
    input: '\n\n',
    expectedWords: 0,
    expectedChars: 0
  },
  {
    input: '* one\n* two\n* three',
    expectedWords: 3,
    expectedChars: 11
  },
  {
    input: '#',
    expectedWords: 0,
    expectedChars: 0
  },
  {
    input: '---\ntitle: "Some title"\nkeywords:\n  - one\n  - two\n  - three\n...\n\n# Heading\n\nLorem Ipsum dolor, sit amet',
    expectedWords: 6,
    expectedChars: 30
  },
  {
    input: 'Some text with **bold** and *emphasized* text in __both__ _flavors_ -- including **_mixes_**!',
    expectedWords: 12,
    expectedChars: 60
  },
  {
    input: 'This is text with a list\n- one\n- two\n- three',
    expectedWords: 9,
    expectedChars: 30
  }
]

describe('Utility#countWords()', function () {
  for (let test of countWordsTesters) {
    it(`should return ${test.expectedWords} words`, function () {
      const ast = markdownToAST(test.input)
      strictEqual(countWords(ast), test.expectedWords)
    })

    it(`should return ${test.expectedChars} characters`, function () {
      const ast = markdownToAST(test.input)
      strictEqual(countChars(ast), test.expectedChars)
    })
  }
})
