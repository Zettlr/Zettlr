/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        countWords tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import countWords from '../source/common/util/count-words'
import { strictEqual } from 'assert'

const countWordsTesters = [
  {
    input: 'Lorem\n\n# Ipsum',
    expectedWords: 2,
    expectedChars: 12
  },
  {
    input: 'Lorem\n\n# Ipsum Dolor',
    expectedWords: 3,
    expectedChars: 18
  },
  {
    input: '\n\n',
    expectedWords: 0,
    expectedChars: 2
  },
  {
    input: '* one\n* two\n* three',
    expectedWords: 3,
    expectedChars: 13
  },
  {
    input: '#',
    expectedWords: 1,
    expectedChars: 1
  },
  {
    input: '---\ntitle: "Some title"\nkeywords:\n  - one\n  - two\n  - three\n...\n\n# Heading\n\nLorem Ipsum dolor, sit amet',
    expectedWords: 6,
    expectedChars: 37
  },
  {
    input: 'Some text with **bold** and *emphasized* text in __both__ _flavors_ -- including **_mixes_**!',
    expectedWords: 12,
    expectedChars: 75
  },
  {
    input: 'This is text with a list\n- one\n- two\n- three',
    expectedWords: 9,
    expectedChars: 38
  }
]

describe('Utility#countWords()', function () {
  for (let test of countWordsTesters) {
    it(`should return ${test.expectedWords} words`, function () {
      strictEqual(countWords(test.input, false), test.expectedWords)
    })

    it(`should return ${test.expectedChars} characters`, function () {
      strictEqual(countWords(test.input, true), test.expectedChars)
    })
  }
})
