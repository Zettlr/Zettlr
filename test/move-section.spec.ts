/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Tests for the addSpacesAroundEmdashes function
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file tests the addSpacesAroundEmdashes function.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import { EditorState, Transaction } from '@codemirror/state'
import { moveSection } from 'source/common/modules/markdown-editor/commands/move-section'
import { tocField } from 'source/common/modules/markdown-editor/plugins/toc-field'
import markdownParser from 'source/common/modules/markdown-editor/parser/markdown-parser'

const baseDocument = `\
# Section 1

This is the Section 1 body.

## Section 1.2

This is the Section 1.2 body.
# Section 2

This is the Section 2 body.

# Section 3

This is the Section 3 body.
## Section 3.1

This is the Section 3.1 body.

### Section 3.1.1

This is the Section 3.1.1 body.`

const moveSectionTests = [
  {
    from: 1,
    to: 12,
    expected: `\
# Section 2

This is the Section 2 body.

# Section 1

This is the Section 1 body.

## Section 1.2

This is the Section 1.2 body.

# Section 3

This is the Section 3 body.
## Section 3.1

This is the Section 3.1 body.

### Section 3.1.1

This is the Section 3.1.1 body.`,
  },
  {
    from: 15,
    to: 5,
    expected: `\
# Section 1

This is the Section 1 body.

## Section 3.1

This is the Section 3.1 body.

### Section 3.1.1

This is the Section 3.1.1 body.

## Section 1.2

This is the Section 1.2 body.
# Section 2

This is the Section 2 body.

# Section 3

This is the Section 3 body.
`,
  },
  {
    from: 19,
    to: 8,
    expected: `\
# Section 1

This is the Section 1 body.

## Section 1.2

This is the Section 1.2 body.
### Section 3.1.1

This is the Section 3.1.1 body.

# Section 2

This is the Section 2 body.

# Section 3

This is the Section 3 body.
## Section 3.1

This is the Section 3.1 body.

`,
  },
  {
    from: 5,
    to: 15,
    expected: `\
# Section 1

This is the Section 1 body.

# Section 2

This is the Section 2 body.

# Section 3

This is the Section 3 body.
## Section 1.2

This is the Section 1.2 body.

## Section 3.1

This is the Section 3.1 body.

### Section 3.1.1

This is the Section 3.1.1 body.`,
  }
]

describe('MarkdownEditor#moveSection()', function () {

  moveSectionTests.forEach((test, idx) => {
    it(`Move Sections: Test ${idx + 1}`, function () {
      const state = EditorState.create({
        doc: baseDocument,
        extensions: [
          tocField,
          markdownParser(),
        ]
      })

      const toc = state.field(tocField)

      const { from, to, expected } = test

      let wasDispatched = false

      const dispatch = (tx: Transaction) => {
        wasDispatched = true

        const contents = tx.newDoc.toString()
        strictEqual(contents, expected, "Sections were moved incorrectly.")
      }

      moveSection(toc, from, to)({ state, dispatch })

      strictEqual(wasDispatched, true, "A transaction must have been dispatched")
    })
  })
})
