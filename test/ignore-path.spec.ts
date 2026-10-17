/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ignorePath tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import { ignorePath } from '../source/common/util/ignore-path'

const ignorePathTesters = [
  { input: 'notes.md', expected: false },
  { input: 'some/dir/notes.md', expected: false },
  { input: '.ztr-directory', expected: true },
  { input: '.DS_Store', expected: true },
  // Electron reports .asar archives as directories, which crashes the FSAL
  // if the archive is inside a workspace (#6551).
  { input: 'app.asar', expected: true },
  { input: 'some/dir/app.asar', expected: true },
  { input: 'C:\\Users\\dir\\app.asar', expected: true },
  { input: 'some/dir/app.asar/index.js', expected: true },
  { input: 'foo.asar.md', expected: false }
]

describe('Utility#ignorePath()', function () {
  for (const test of ignorePathTesters) {
    it(`should return ${String(test.expected)} for "${test.input}"`, () => {
      strictEqual(ignorePath(test.input), test.expected)
    })
  }
})
