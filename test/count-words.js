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

const countWords = require('../source/common/util/count-words').default
const assert = require('assert')

const countWordsTesters = [
  { input: 'Lorem\n\n# Ipsum', expected: 2 },
  { input: 'Lorem\n\n# Ipsum Dolor', expected: 3 },
  { input: '\n\n', expected: 0 },
  { input: '* one\n* two\n* three', expected: 3 },
  { input: '#', expected: 1 },
  { input: '---\ntitle: "Some title"\nkeywords:\n  - one\n  - two\n  - three\n...\n\n# Heading\n\nLorem Ipsum dolor, sit amet', expected: 6 },
  { input: 'Some text with **bold** and *emphasized* text in __both__ _flavors_ -- including **_mixes_**!', expected: 12 }
]

describe('Utility#countWords()', function () {
  for (let test of countWordsTesters) {
    it(`should return ${test.expected} words`, function () {
      assert.strictEqual(countWords(test.input), test.expected)
    })
  }
})
