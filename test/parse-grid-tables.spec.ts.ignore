/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        gridParser tests
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import parseGridTable from '../source/common/modules/markdown-editor/table-editor/parse-grid'
import { deepStrictEqual } from 'assert'

const table: string[] = []
const tableResults: Array<{ ast: string[][], colAlignments: string[] }> = []

/** * * * * * * * * * * * * * * * * * *
 * TABLE ONE
 */
table.push(`+---------------+---------------+--------------------+
| Fruit         | Price         | Advantages         |
+===============+===============+====================+
| Bananas       | $1.34         | - built-in wrapper |
|               |               | - bright color     |
+---------------+---------------+--------------------+
| Oranges       | $2.10         | - cures scurvy     |
|               |               | - tasty            |
+---------------+---------------+--------------------+`)

tableResults.push({
  ast: [
    [ 'Fruit', 'Price', 'Advantages' ],
    [ 'Bananas', '$1.34', '- built-in wrapper\n- bright color' ],
    [ 'Oranges', '$2.10', '- cures scurvy\n- tasty' ]
  ],
  colAlignments: [ 'left', 'left', 'left' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE TWO
 */
table.push(`+---------------+---------------+--------------------+
| Right         | Left          | Centered           |
+==============:+:==============+:==================:+
| Bananas       | $1.34         | built-in wrapper   |
+---------------+---------------+--------------------+`)

tableResults.push({
  ast: [
    [ 'Right', 'Left', 'Centered' ],
    [ 'Bananas', '$1.34', 'built-in wrapper' ]
  ],
  colAlignments: [ 'right', 'left', 'center' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE THREE
 */
table.push(`+--------------:+:--------------+:------------------:+
| Right         | Left          | Centered           |
+---------------+---------------+--------------------+`)

tableResults.push({
  ast: [[ 'Right', 'Left', 'Centered' ]],
  colAlignments: [ 'right', 'left', 'center' ]
})

describe('TableEditor#gridParser()', function () {
  for (let i = 0; i < table.length; i++) {
    it(`Should parse test table ${i + 1} correctly`, function () {
      deepStrictEqual(parseGridTable(table[i]), tableResults[i])
    })
  }
})
