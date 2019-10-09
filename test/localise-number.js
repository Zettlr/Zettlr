/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        localiseNumber tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const localiseNumber = require('../source/common/util/localise-number')
const assert = require('assert')

const localiseNumberTesters = [
  { 'input': 123456789, 'expected': '123,456,789' },
  { 'input': 143, 'expected': '143' },
  { 'input': 0, 'expected': '0' },
  { 'input': -14320, 'expected': '-14,320' },
  { 'input': 9482.23, 'expected': '9,482.23' },
  { 'input': -23476.66, 'expected': '-23,476.66' }
]

describe('Utility#localiseNumber()', function () {
  for (let test of localiseNumberTesters) {
    it(`should return ${test.expected} for ${test.input.toString()}`, function () {
      global.i18n = { 'localise': { 'thousand_delimiter': ',', 'decimal_delimiter': '.' } }
      assert.strictEqual(localiseNumber(test.input), test.expected)
    })
  }
})

global.i18n = undefined // Unset
