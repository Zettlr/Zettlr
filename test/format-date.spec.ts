/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        formatDate test
 * CVM-Role:        Unit Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This tests the ability of Zettlr to format dates
 *
 * END HEADER
 */

import assert from 'assert'
import formatDate from '../source/common/util/format-date'

const tests = [
  // First general tests
  {
    input: Date.parse('09 Feb 2022 10:59:23'),
    relative: false,
    locale: 'en-US',
    expected: 'February 9, 2022 at 10:59 AM'
  },
  {
    input: Date.parse('09 Feb 2022 10:59:23'),
    relative: false,
    locale: 'de-DE',
    expected: '9. Februar 2022 um 10:59'
  },
  {
    input: Date.parse('01 Jan 1970 00:00:00'),
    relative: false,
    locale: 'en-US',
    expected: 'January 1, 1970 at 12:00 AM'
  },
  // Now, some relative tests.
  // NOTE: We cannot currently test for "just now" (< 1 min) since that depends
  // on a translation which needs to come from main!
  {
    input: Date.now() - 1000 * 60 * 23,
    relative: true,
    locale: 'en-US',
    expected: '23 min. ago'
  },
  {
    input: Date.now() - 1000 * 60 * 23,
    relative: true,
    locale: 'de-DE',
    expected: 'vor 23 Min.'
  },
  {
    input: Date.now() - 1000 * 60 * 120,
    relative: true,
    locale: 'en-US',
    expected: '2 hr. ago'
  },
  {
    input: Date.now() - 1000 * 60 * 120,
    relative: true,
    locale: 'de-DE',
    expected: 'vor 2 Std.'
  }
]

describe('formatDate()', function () {
  for (const test of tests) {
    it(`formats the date ${test.expected}`, function () {
      assert.deepStrictEqual(formatDate(test.input, test.locale, test.relative), test.expected)
    })
  }
})
