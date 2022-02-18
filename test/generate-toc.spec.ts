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
import generateTableOfContents from '../source/common/modules/markdown-editor/util/generate-toc'

const tests = [
  {
    // This document contains a comment in the YAML frontmatter which should not
    // be detected as comment
    input: `---
# title: "Generic Markdown Document #1"
author:
- name: John Doe
  affiliation: Oxford University
  email: john.doe@mail.example
- name: Jane Doe
  affiliation: Stanford University
  email: jane@doe.tld
date: January 2014
abstract: Lorem ipsum dolor sit amet
bibliography: <!-- A block comment. -->
...

# Heading 1.0

Lorem ipsum dolor

## Heading 1.1

asdf

### Heading 1.1.1

wasd

## Heading 1.2

Some text

# Heading 2.0

**Note:** This document is itself written using markdown; you
can [see the source for it by adding '.text' to the URL](/projects/markdown/syntax.text).

[This is a link to the other generic markdown file](./Testfile Generic Markdown Documents 2.md)
`,
    expected: [
      { line: 14, text: 'Heading 1.0', level: 1, renderedLevel: '1' },
      { line: 18, text: 'Heading 1.1', level: 2, renderedLevel: '1.1' },
      { line: 22, text: 'Heading 1.1.1', level: 3, renderedLevel: '1.1.1' },
      { line: 26, text: 'Heading 1.2', level: 2, renderedLevel: '1.2' },
      { line: 30, text: 'Heading 2.0', level: 1, renderedLevel: '2' }
    ]
  }
]

describe('generateTableOfContents()', function () {
  for (const test of tests) {
    it('Generates a ToC correctly', function () {
      assert.deepStrictEqual(generateTableOfContents(test.input), test.expected)
    })
  }
})
