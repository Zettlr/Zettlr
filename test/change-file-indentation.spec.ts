/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File Indentation change tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import { changeFileIndentation } from 'source/app/service-providers/documents/util/change-file-indentation'

interface Test {
  newIndent: '\t'|' '
  newSize: number
  input: string
  output: string
}

const testers: Test[] = [
  {
    newIndent: '\t',
    newSize: 3, // Intentional wrong number
    input: `# This is a Markdown document

It has an indentation of four spaces.

- One
    - Sub one
    - Sub two
- Two

Here is an odd indentation that should be kept:

 Hello.

Another thing it should not do is tamper with trailing spaces as here    

Or in this other line:        `,
    output: `# This is a Markdown document

It has an indentation of four spaces.

- One
	- Sub one
	- Sub two
- Two

Here is an odd indentation that should be kept:

 Hello.

Another thing it should not do is tamper with trailing spaces as here    

Or in this other line:        `
  },
  {
    newIndent: ' ',
    newSize: 7,
    input: `# This is a Markdown document

It has an indentation of four spaces.

- One
	- Sub one
	- Sub two
- Two

Here is an odd indentation that should be kept:

 Hello.

Another thing it should not do is tamper with trailing spaces as here    

Or in this other line:        `,
    output: `# This is a Markdown document

It has an indentation of four spaces.

- One
       - Sub one
       - Sub two
- Two

Here is an odd indentation that should be kept:

 Hello.

Another thing it should not do is tamper with trailing spaces as here    

Or in this other line:        `
  }
]

describe('Utility#changeFileIndentation()', function () {
  for (const test of testers) {
    it(`should propely adapt the indentation to "${test.newIndent}" (width: ${test.newSize})`, function () {
      strictEqual(changeFileIndentation(test.input, test.newIndent, test.newSize), test.output)
    })
  }
})
