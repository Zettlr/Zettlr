/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        makeValidUri tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const sanitiseTexValue = require('../source/common/util/sanitise-tex-value')
const assert = require('assert')

const testers = [
  { 'input': 'Alice & Bob', 'expected': 'Alice \\& Bob' }
]

describe('Utility#sanitizeTexValue()', function () {
  for (let test of testers) {
    it(`Input "${test.input}" should return ${test.expected}`, function () {
      assert.strictEqual(sanitiseTexValue(test.input), test.expected)
    })
  }
})
