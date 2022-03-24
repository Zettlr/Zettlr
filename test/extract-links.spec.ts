/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractLinks test
 * CVM-Role:        Unit Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This tests the ability of Zettlr to extract links
 *
 * END HEADER
 */

import assert from 'assert'
import extractLinks from '../source/app/service-providers/fsal/util/extract-links'

const tests = [
  {
    input: 'Just something without any links.',
    expected: []
  },
  {
    input: 'Here is now one link to [[12345678901234]] contained!',
    expected: ['12345678901234']
  },
  {
    input: `In this string, we have both line feeds and a more complicated
setup. For example here is one link: [[15748329012]] and a link using a
[[filename.md]]. Now, we can also have opening [[123485123 links which never close.

Also, what about links that close]] but never open?`,
    expected: [ '15748329012', 'filename.md' ]
  }
]

describe('extractTags()', function () {
  for (const test of tests) {
    it(`extracts the links [ ${test.expected.join(', ')} ]`, function () {
      assert.deepStrictEqual(extractLinks(test.input), test.expected)
    })
  }
})
