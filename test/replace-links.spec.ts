/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        replaceLinks tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import replaceLinks from '@common/util/replace-links'
import { strictEqual } from 'assert'

// NOTE: THESE TESTS ASSUME THE DEFAULT SETTING `link|title` FOR LINKS.

// The initial document contains links to both Zettelkasten as well as
// Zettelkasten (Luhmann).
const firstDocument = `---
title: "A simple test document"
author: Zettlr
---

# A simple test document

This document is used to test the link replacement of Zettlr. For example, if
you have an internal wiki/Zettelkasten link to [[Zettelkasten]], if you then
rename the file \`Zettelkasten.md\` to, say, \`Zettelkasten (Luhmann).md\`,
Zettlr should be able to replace those links wherever they occur so that the
file then links to [[Zettelkasten (Luhmann)]] instead (and vice versa). The
"fancy" links that some users have come up with
[should not work]([[Zettelkasten]]).

Also, this needs to work if the ending is preserved, as in [[Zettelkasten.md]]
or [[Zettelkasten (Luhmann).md]].

Finally, users may use explicit title strings, which should be preserved as
well: [[Zettelkasten|This is an arbitrary title that needs to be preserved.]]`

// The second document represents the document after a replacement of
// "Zettelkasten" with "Zettelkasten (Luhmann)"
const secondDocument = `---
title: "A simple test document"
author: Zettlr
---

# A simple test document

This document is used to test the link replacement of Zettlr. For example, if
you have an internal wiki/Zettelkasten link to [[Zettelkasten (Luhmann)]], if you then
rename the file \`Zettelkasten.md\` to, say, \`Zettelkasten (Luhmann).md\`,
Zettlr should be able to replace those links wherever they occur so that the
file then links to [[Zettelkasten (Luhmann)]] instead (and vice versa). The
"fancy" links that some users have come up with
[should not work]([[Zettelkasten]]).

Also, this needs to work if the ending is preserved, as in [[Zettelkasten (Luhmann).md]]
or [[Zettelkasten (Luhmann).md]].

Finally, users may use explicit title strings, which should be preserved as
well: [[Zettelkasten (Luhmann)|This is an arbitrary title that needs to be preserved.]]`

// Finally, the third document should change all links to just "Zettelkasten" again.
const thirdDocument = `---
title: "A simple test document"
author: Zettlr
---

# A simple test document

This document is used to test the link replacement of Zettlr. For example, if
you have an internal wiki/Zettelkasten link to [[Zettelkasten]], if you then
rename the file \`Zettelkasten.md\` to, say, \`Zettelkasten (Luhmann).md\`,
Zettlr should be able to replace those links wherever they occur so that the
file then links to [[Zettelkasten]] instead (and vice versa). The
"fancy" links that some users have come up with
[should not work]([[Zettelkasten]]).

Also, this needs to work if the ending is preserved, as in [[Zettelkasten.md]]
or [[Zettelkasten.md]].

Finally, users may use explicit title strings, which should be preserved as
well: [[Zettelkasten|This is an arbitrary title that needs to be preserved.]]`

const replaceLinksTesters = [
  {
    oldName: 'Zettelkasten.md',
    newName: 'Zettelkasten (Luhmann).md',
    input: firstDocument,
    output: secondDocument
  },
  {
    oldName: 'Zettelkasten (Luhmann).md',
    newName: 'Zettelkasten.md',
    input: secondDocument,
    output: thirdDocument
  }
]

describe('Utility#replaceLinks()', function () {
  for (const test of replaceLinksTesters) {
    it(`should replace "${test.oldName}" with "${test.newName}"`, function () {
      strictEqual(replaceLinks(test.input, test.oldName, test.newName), test.output)
    })
  }
})
