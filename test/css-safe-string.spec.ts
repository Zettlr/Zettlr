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

import { strictEqual } from "assert"
import cssSafeString from "source/common/util/css-safe-string"

const tests = [
  { input: 'some arbitrary text', expected: 'some-arbitrary-text' },
  { input: 'some-text-but-with-✅', expected: 'some-text-but-with-' },
  { input: '', expected: '' },
  { input: '99-air-balloons', expected: '_9-air-balloons' },
  { input: '--looks-like-a-var', expected: '__looks-like-a-var' },
  { input: '-1—up', expected: '__up' },
]

describe('Utility#cssSafeString()', function () {
  for (const test of tests) {
    it(`should sanitize "${test.input}" to "${test.expected}"`, function () {
      strictEqual(cssSafeString(test.input), test.expected)
    })
  }
})
