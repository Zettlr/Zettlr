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

// NOTE: This is the opposite of the parse-grid-table tester. The only difference
// is that the grid table builder only uses up as much space as necessary, while
// the parser can work with "too much" space well.
import buildGridTable from '../source/common/modules/markdown-editor/table-editor/build-grid'
import { deepStrictEqual } from 'assert'
import { ColAlignment } from '@common/modules/markdown-editor/table-editor/types'

const table: Array<{ ast: string[][], colAlignments: ColAlignment[], hasHeader: boolean }> = []
const tableResults: string[] = []

/** * * * * * * * * * * * * * * * * * *
* TABLE ONE
*/
tableResults.push(`+---------+-------+--------------------+
| Fruit   | Price | Advantages         |
+=========+=======+====================+
| Bananas | $1.34 | - built-in wrapper |
|         |       | - bright color     |
+---------+-------+--------------------+
| Oranges | $2.10 | - cures scurvy     |
|         |       | - tasty            |
+---------+-------+--------------------+`)

table.push({
  ast: [
    [ 'Fruit', 'Price', 'Advantages' ],
    [ 'Bananas', '$1.34', '- built-in wrapper\n- bright color' ],
    [ 'Oranges', '$2.10', '- cures scurvy\n- tasty' ]
  ],
  colAlignments: [ 'left', 'left', 'left' ],
  hasHeader: true
})

/** * * * * * * * * * * * * * * * * * *
* TABLE TWO
*/
tableResults.push(`+---------+-------+------------------+
| Right   | Left  | Centered         |
+========:+=======+:================:+
| Bananas | $1.34 | built-in wrapper |
+---------+-------+------------------+`)

table.push({
  ast: [
    [ 'Right', 'Left', 'Centered' ],
    [ 'Bananas', '$1.34', 'built-in wrapper' ]
  ],
  colAlignments: [ 'right', 'left', 'center' ],
  hasHeader: true
})

/** * * * * * * * * * * * * * * * * * *
* TABLE THREE
*/
tableResults.push(`+------:+------+:--------:+
| Right | Left | Centered |
+-------+------+----------+`)

table.push({
  ast: [[ 'Right', 'Left', 'Centered' ]],
  colAlignments: [ 'right', 'left', 'center' ],
  hasHeader: false
})

describe('TableEditor#buildGrid()', function () {
  for (let i = 0; i < table.length; i++) {
    it(`Should build test table ${i + 1} correctly`, function () {
      const { ast, colAlignments, hasHeader } = table[i]
      deepStrictEqual(buildGridTable(ast, colAlignments, hasHeader), tableResults[i])
    })
  }
})
