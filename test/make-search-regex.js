/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        makeSearchRegex tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const makeSearchRegex = require('../source/common/util/make-search-regex')
const assert = require('assert')

const makeSearchRegexTesters = [
  { 'input': 'hello', 'expected': /hello/i },
  { 'input': '/\\w/g', 'expected': /\w/g },
  { 'input': '/\\w/abide', 'expected': /\/\\w\/abide/i }, // Wrong flags, should be treated as a normal search
  { 'input': '/[a-zA-Z0-9]/', 'expected': /[a-zA-Z0-9]/ },
  { 'input': '/<a href="(.+?)">(.+?)<\\/a>/', 'expected': /<a href="(.+?)">(.+?)<\/a>/ }
]

describe('Utility#makeSearchRegex()', function () {
  for (let test of makeSearchRegexTesters) {
    // For each tested unit, expect the string representations of both
    // the correct and the input regular expression to be equal.
    it(`should return the regular expression ${String(test.expected)}`, function () {
      assert.strictEqual(String(makeSearchRegex(test.input)), String(test.expected))
    })
  }
})
