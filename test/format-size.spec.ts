/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        formatSize tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import formatSize from '@common/util/format-size'
import assert from 'assert'

const formatSizeTesters = [
  // Bytes
  { 'input': 0, 'short': true, 'expected': '0 B' },
  { 'input': 999, 'short': true, 'expected': '999 B' },
  { 'input': 1023, 'short': true, 'expected': '1023 B' },
  // Kilobytes
  { 'input': 1024, 'short': true, 'expected': '1 KB' },
  { 'input': 512000, 'short': true, 'expected': '512 KB' },
  // A size just below the next unit must not render as 1000 or more of the
  // smaller one
  { 'input': 999999, 'short': true, 'expected': '1 MB' },
  { 'input': 1023999, 'short': true, 'expected': '1 MB' },
  // Megabytes
  { 'input': 1024000, 'short': true, 'expected': '1 MB' },
  { 'input': 5000000, 'short': true, 'expected': '5 MB' },
  { 'input': 999999999, 'short': true, 'expected': '1 GB' },
  { 'input': 1023999999, 'short': true, 'expected': '1 GB' },
  // Gigabytes, which is the largest unit and therefore has no roll-over
  { 'input': 1024000000, 'short': true, 'expected': '1 GB' },
  { 'input': 5000000000, 'short': true, 'expected': '5 GB' },
  { 'input': 2000000000000, 'short': true, 'expected': '2000 GB' },
  // Long labels
  { 'input': 1023, 'short': false, 'expected': '1023 Byte' },
  { 'input': 1024, 'short': false, 'expected': '1 Kilobyte' },
  { 'input': 1023999, 'short': false, 'expected': '1 Megabyte' },
  { 'input': 1023999999, 'short': false, 'expected': '1 Gigabyte' }
]

describe('Utility#formatSize()', function () {
  for (const test of formatSizeTesters) {
    it(`should return ${test.expected} for ${test.input.toString()}`, function () {
      assert.strictEqual(formatSize(test.input, test.short), test.expected)
    })
  }

  it('should default to the long labels', function () {
    assert.strictEqual(formatSize(512), '512 Byte')
  })
})
