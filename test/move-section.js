/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractBibTexAttachments tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const moveSection = require('../source/common/util/move-section')
const assert = require('assert')

const INPUT = [
  `# Lorem ipsum dolor sit amet

- A list
- second item
- Third item

## Heading Level 2

Some text here.

![Also an image](/test/image.png)

## Another Heading Level 2

Also, here's some text. This text should end up above the first heading level 2.`,
// * * * * * * * * * * * * * * * * *
`# Lorem ipsum dolor sit amet

- A list
- second item
- Third item

## Heading Level 2

Some text here.

![Also an image](/test/image.png)

## Another Heading Level 2

Also, here's some text. This text should end up above the first heading level 2.`,
// * * * * * * * * * * * * * * * * *
`# 1. Section

## 1.1 Heading

Text Section 1

# 2. Section

Text Section 2

# 3. Section

Text Section 3

## 3.1 Heading

More text.

# 4. Section

Text Section 4`
]

const MOVE = [
  // Move the first example above
  { from: 12, to: 6 }, // Move a section
  { from: 6, to: -1 }, // -1 indicates "move to end"
  { from: 6, to: 18 } // Swap two sections
]

const OUTPUT = [
  `# Lorem ipsum dolor sit amet

- A list
- second item
- Third item

## Another Heading Level 2

Also, here's some text. This text should end up above the first heading level 2.

## Heading Level 2

Some text here.

![Also an image](/test/image.png)`,
// * * * * * * * * * * * * * * * * *
`# Lorem ipsum dolor sit amet

- A list
- second item
- Third item

## Another Heading Level 2

Also, here's some text. This text should end up above the first heading level 2.

## Heading Level 2

Some text here.

![Also an image](/test/image.png)`,
// * * * * * * * * * * * * * * * * *
`# 1. Section

## 1.1 Heading

Text Section 1

# 3. Section

Text Section 3

## 3.1 Heading

More text.

# 2. Section

Text Section 2

# 4. Section

Text Section 4`
]

describe('EditorUtility#moveSection()', function () {
  for (let i = 0; i < INPUT.length; i++) {
    it('should correctly move the defined section', function () {
      assert.strictEqual(moveSection(INPUT[i], MOVE[i].from, MOVE[i].to), OUTPUT[i])
    })
  }
})
