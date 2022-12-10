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

// DEBUG: This test is currently failing since mocha is unable to load ES6 modules.
// It all began with bcp-47 being converted to an ES6 module, and it's preferable
// to use import instead of require either way, so we're gonna disable this test
// for the time being. Plus, the test never failed, and I don't see any reason
// why we would need to change that function, so ... just don't change it, and
// we'll be good!
import localiseNumber from '@common/util/localise-number'
import assert from 'assert'

const localiseNumberTesters = [
  { 'input': 123456789, 'expected': '123,456,789' },
  { 'input': 143, 'expected': '143' },
  { 'input': 0, 'expected': '0' },
  { 'input': -14320, 'expected': '-14,320' },
  { 'input': 9482.23, 'expected': '9,482.23' },
  { 'input': -23476.66, 'expected': '-23,476.66' }
]

describe('Utility#localiseNumber()', function () {
  before(function () {
    global.i18n = global.i18nFallback = { 'localise': { 'thousand_delimiter': ',', 'decimal_delimiter': '.' } }
  })

  for (let test of localiseNumberTesters) {
    it(`should return ${test.expected} for ${test.input.toString()}`, function () {
      assert.strictEqual(localiseNumber(test.input), test.expected)
    })
  }

  after(function () {
    global.i18n = global.i18nFallback = undefined // Unset
  })
})
