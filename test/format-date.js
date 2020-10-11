/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        formatDate tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const formatDate = require('../source/common/util/format-date')
const assert = require('assert')

// We will be testing two languages to make sure the correct values from config are expected
const formatDateTesters = [
  { 'input': new Date('2016-10-09T12:44:23'), 'expectedDE': '9. Oktober 2016 um 12:44', 'expectedEN': 'October 9, 2016 at 12:44 PM' },
  { 'input': new Date('2019-01-03T00:09:00'), 'expectedDE': '3. Januar 2019 um 00:09', 'expectedEN': 'January 3, 2019 at 12:09 AM' },
  { 'input': new Date('1970-01-01T00:01:00'), 'expectedDE': '1. Januar 1970 um 00:01', 'expectedEN': 'January 1, 1970 at 12:01 AM' },
  { 'input': new Date('1945-05-08T12:00:00'), 'expectedDE': '8. Mai 1945 um 12:00', 'expectedEN': 'May 8, 1945 at 12:00 PM' }
]

describe('Utility#formatDate()', function () {
  for (let test of formatDateTesters) {
    it(`should return ${test.expectedDE}`, function () {
      global.config = { get: () => { return 'de-DE' } }
      assert.strictEqual(formatDate(test.input), test.expectedDE)
    })
    it(`should return ${test.expectedEN}`, function () {
      global.config = { get: () => { return 'en-US' } }
      assert.strictEqual(formatDate(test.input), test.expectedEN)
    })
  }
  global.config = undefined // Never forget to unset!
})
