/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        makeImgPathsAbsolute tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const makeImgPathsAbsolute = require('../source/common/util/make-img-paths-absolute')
const assert = require('assert')

const BASEPATH = '/home/foo/bar/'

const testers = [
  { 'input': '![Test](./test.png)', 'expected': '![Test](/home/foo/bar/test.png)' },
  { 'input': '![Test](../test.png)', 'expected': '![Test](/home/foo/test.png)' },
  { 'input': '![Test](test.png)', 'expected': '![Test](/home/foo/bar/test.png)' },
  { 'input': '![Test](http://some-url.com/test.png)', 'expected': '![Test](http://some-url.com/test.png)' },
  { 'input': '![Test](ftp://some-url.com/test.png)', 'expected': '![Test](ftp://some-url.com/test.png)' },
  { 'input': '![Test](file://./test.png)', 'expected': '![Test](file://./test.png)' },
  // Test for captions and alt-text
  { 'input': '![Test](file://./test.png "Alt Text")', 'expected': '![Test](file://./test.png "Alt Text")' },
  { 'input': '![](file://./test.png "Alt Text")', 'expected': '![](file://./test.png "Alt Text")' },
  { 'input': '![](./test.png "Alt Text")', 'expected': '![](/home/foo/bar/test.png "Alt Text")' },
  { 'input': '![Test](../test.png "Alt Text")', 'expected': '![Test](/home/foo/test.png "Alt Text")' },
  { 'input': '![Test](ftp://some-url.com/test.png "Alt Text")', 'expected': '![Test](ftp://some-url.com/test.png "Alt Text")' },
  // Test for the additional meta data of an image
  { 'input': '![Test](file://./test.png "Alt Text"){. class}', 'expected': '![Test](file://./test.png "Alt Text"){. class}' },
  { 'input': '![](file://./test.png "Alt Text"){. class}', 'expected': '![](file://./test.png "Alt Text"){. class}' },
  { 'input': '![](./test.png "Alt Text"){. class}', 'expected': '![](/home/foo/bar/test.png "Alt Text"){. class}' },
  { 'input': '![Test](../test.png "Alt Text"){. class}', 'expected': '![Test](/home/foo/test.png "Alt Text"){. class}' },
  { 'input': '![Test](ftp://some-url.com/test.png "Alt Text"){. class}', 'expected': '![Test](ftp://some-url.com/test.png "Alt Text"){. class}' },
  // Minimal examples
  { 'input': '![](./test.png)', 'expected': '![](/home/foo/bar/test.png)' },
]

describe('Utility#makeImgPathsAbsolute()', function () {
  for (let test of testers) {
    it(`should return ${test.expected} for ${test.input}`, function () {
      global.i18n = { 'localise': { 'thousand_delimiter': ',', 'decimal_delimiter': '.' } }
      assert.strictEqual(makeImgPathsAbsolute(BASEPATH, test.input), test.expected)
    })
  }
})

global.i18n = undefined // Unset
