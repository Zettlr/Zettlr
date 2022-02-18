/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractTags test
 * CVM-Role:        Unit Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This tests the ability of Zettlr to extract tags
 *
 * END HEADER
 */

import assert from 'assert'
import extractTags from '../source/app/service-providers/fsal/util/extract-tags'

const tests = [
  {
    input: 'Just something without any tags.',
    expected: []
  },
  {
    input: 'Here is now one #tag contained!',
    expected: ['tag']
  },
  {
    input: 'Here is an \\#escaped tag and a #regular tag',
    expected: ['regular']
  },
  {
    input: `---
title: "Here is some title"
author: Jane Doe
keywords: 123
---

Further Markdown content with #one-tag`,
    expected: [ 'one-tag', '123' ]
  },
  {
    input: `---
title: "Here is some title"
author: Jane Doe
keywords: 123, hello, true
---

Further Markdown content with #one-tag`,
    expected: [ 'one-tag', '123', 'hello', 'true' ]
  },
  {
    input: `---
title: "Here is some title"
author: Jane Doe
keywords:
  - 123
  - hello
  - true
---

Further Markdown content with #one-tag`,
    expected: [ 'one-tag', '123', 'hello', 'true' ]
  },
  {
    input: `---
title: "Here is some title"
author: Jane Doe
keywords:
---

This Markdown file doesn't contain tags, but it contains a
[link](#other-heading) with an anchor to another heading!`,
    expected: []
  }
]

describe('extractTags()', function () {
  for (const test of tests) {
    it(`extracts the tags [ ${test.expected.join(', ')} ]`, function () {
      assert.deepStrictEqual(extractTags(test.input), test.expected)
    })
  }
})
