/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        replaceTags tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import replaceTags from '@common/util/replace-tags'
import { strictEqual } from 'assert'

const testDocument = `---
title: "A simple test document"
author: Zettlr
keywords:
- one tag
- second-tag
---

# A simple test document

This #document contains some tags as well as some edge-cases to test the ability
of the replaceTags function to properly replace tags within files.

It contains a YAML frontmatter that defines one keyword with a space in it that
cannot occur anywhere else in the document; as well as the #second-tag that now
also occurs within here.

For example, if we have a [link](#second-tag), it shouldn't be replaced.
Similarly with [link](example.com#second-tag).`

const replaceTagsTesters = [
  {
    // With spaces -> with spaces
    oldTag: 'one tag', newTag: 'A new keyword', expected: `---
title: "A simple test document"
author: Zettlr
keywords:
- A new keyword
- second-tag
---

# A simple test document

This #document contains some tags as well as some edge-cases to test the ability
of the replaceTags function to properly replace tags within files.

It contains a YAML frontmatter that defines one keyword with a space in it that
cannot occur anywhere else in the document; as well as the #second-tag that now
also occurs within here.

For example, if we have a [link](#second-tag), it shouldn't be replaced.
Similarly with [link](example.com#second-tag).`
  },
  {
    // No spaces -> no spaces
    oldTag: 'second-tag', newTag: 'new-keyword', expected: `---
title: "A simple test document"
author: Zettlr
keywords:
- one tag
- new-keyword
---

# A simple test document

This #document contains some tags as well as some edge-cases to test the ability
of the replaceTags function to properly replace tags within files.

It contains a YAML frontmatter that defines one keyword with a space in it that
cannot occur anywhere else in the document; as well as the #new-keyword that now
also occurs within here.

For example, if we have a [link](#second-tag), it shouldn't be replaced.
Similarly with [link](example.com#second-tag).`
  },
  {
    // No spaces -> spaces
    oldTag: 'second-tag', newTag: 'New keyword', expected: `---
title: "A simple test document"
author: Zettlr
keywords:
- one tag
- New keyword
---

# A simple test document

This #document contains some tags as well as some edge-cases to test the ability
of the replaceTags function to properly replace tags within files.

It contains a YAML frontmatter that defines one keyword with a space in it that
cannot occur anywhere else in the document; as well as the  that now
also occurs within here.

For example, if we have a [link](#second-tag), it shouldn't be replaced.
Similarly with [link](example.com#second-tag).`
  },
  {
    // Spaces -> No spaces
    oldTag: 'one tag', newTag: 'one-tag', expected: `---
title: "A simple test document"
author: Zettlr
keywords:
- one-tag
- second-tag
---

# A simple test document

This #document contains some tags as well as some edge-cases to test the ability
of the replaceTags function to properly replace tags within files.

It contains a YAML frontmatter that defines one keyword with a space in it that
cannot occur anywhere else in the document; as well as the #second-tag that now
also occurs within here.

For example, if we have a [link](#second-tag), it shouldn't be replaced.
Similarly with [link](example.com#second-tag).`
  }
]

describe('Utility#replaceTags()', function () {
  for (const test of replaceTagsTesters) {
    it(`should replace the tag "${test.oldTag}" with "${test.newTag}"`, function () {
      strictEqual(replaceTags(testDocument, test.oldTag, test.newTag), test.expected)
    })
  }
})
