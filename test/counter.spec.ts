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
  },
  {
    // A link whose visible text is an image counts the image's alt, not the raw
    // image Markdown/URL. Same as the bare image `![alt text](…)`. See #6093.
    input: '[![alt text](https://example.com/img.png)](https://example.com)',
    locale: 'en',
    expectedWords: 2,
    expectedChars: 8
  },
  {
    // A link title (the quoted tooltip after the URL) is metadata, not counted.
    input: '[Wikipedia test](https://en.wikipedia.org/wiki/Function "Math article")',
    locale: 'en',
    expectedWords: 2,
    expectedChars: 14
  },
  {
    // Mixed inline content inside a link: count every visible piece (text,
    // emphasis, each image's alt) but never the URLs. See #6093.
    input: '[some alt text, *an image*, ![alt text](https://example.com/img.png), and another image ![alt text](https://example.com/img.png)](https://example.com)',
    locale: 'en',
    expectedWords: 12,
    expectedChars: 61
  }
]

describe('Utility#counter()', function () {
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
