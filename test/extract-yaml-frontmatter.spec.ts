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
import extractYamlFrontmatter from '@common/util/extract-yaml-frontmatter'

const tests = [
  {
    input: 'Single line file that should not have a frontmatter',
    expected: null
  },
  {
    input: `---
title: "Here is some title"
author: Jane Doe
keywords: 123
---

Further Markdown content.`,
    expected: {
      title: 'Here is some title',
      author: 'Jane Doe',
      keywords: 123
    }
  },
  {
    input: `---
title: "Here is some title"
author: Jane Doe
keywords: 123, hello, true
---

Further Markdown content.`,
    expected: {
      title: 'Here is some title',
      author: 'Jane Doe',
      keywords: '123, hello, true'
    }
  },
  {
    input: `This file does not start with a YAML frontmatter, so it should not
be detected, even if it's valid.

---
title: "Here is some title"
author: Jane Doe
keywords:
  - 123
  - hello
  - true
---

Further Markdown content .`,
    expected: null
  }
]

describe('extractYamlFrontmatter()', function () {
  for (const test of tests) {
    const { frontmatter } = extractYamlFrontmatter(test.input)
    const out = test.expected === null ? 'extracts no frontmatter' : 'extracts the existing frontmatter'
    it(out, function () {
      assert.deepStrictEqual(frontmatter, test.expected)
    })
  }
})
 