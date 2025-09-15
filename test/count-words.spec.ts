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
import { countAll } from '../source/common/util/counter'
import { strictEqual } from 'assert'

const countWordsTesters = [
  {
    input: '',
    locale: 'en',
    expectedWords: 0,
    expectedChars: 0
  },
  {
    input: 'Lorem\n\n# Ipsum',
    locale: 'en',
    expectedWords: 2,
    expectedChars: 10
  },
  {
    input: 'Lorem\n\n# Ipsum Dolor',
    locale: 'en',
    expectedWords: 3,
    expectedChars: 16
  },
  {
    input: '\n\n',
    locale: 'en',
    expectedWords: 0,
    expectedChars: 0
  },
  {
    input: '* one\n* two\n* three',
    locale: 'en',
    expectedWords: 3,
    expectedChars: 11
  },
  {
    input: '#',
    locale: 'en',
    expectedWords: 0,
    expectedChars: 0
  },
  {
    input: '---\ntitle: "Some title"\nkeywords:\n  - one\n  - two\n  - three\n...\n\n# Heading\n\nLorem Ipsum dolor, sit amet',
    locale: 'en',
    expectedWords: 6,
    expectedChars: 34
  },
  {
    input: 'Some text with **bold** and *emphasized* text in __both__ _flavors_ -- including **_mixes_**!',
    locale: 'en',
    expectedWords: 12,
    expectedChars: 71
  },
  {
    input: 'This is text with a list\n- one\n- two\n- three',
    locale: 'en',
    expectedWords: 9,
    expectedChars: 35
  },
  {
    input: '我輩は猫である。',
    locale: 'ja',
    expectedWords: 5,
    expectedChars: 8
  },
  {
    input: 'ゼットルは知識をつなぐ。',
    locale: 'ja',
    expectedWords: 5,
    expectedChars: 12
  },
  {
    input: 'Zettlrはゼットルと読む。',
    locale: 'ja',
    expectedWords: 5,
    expectedChars: 15
  },
  { input: '**Zettlr**では*Markdown*を使います。',
    locale: 'ja',
    expectedWords: 6,
    expectedChars: 22
  }
]

describe('Utility#countWords()', function () {
  let idx = 0
  for (let test of countWordsTesters) {
    idx++
    const ast = markdownToAST(test.input)
    const { words, chars } = countAll(ast, test.locale)

    it(`${idx}. should return ${test.expectedWords} words (${test.locale})`, function () {
      strictEqual(words, test.expectedWords)
    })

    it(`${idx}. should return ${test.expectedChars} characters (${test.locale})`, function () {
      const ast = markdownToAST(test.input)
      strictEqual(chars, test.expectedChars)
    })
  }
})
