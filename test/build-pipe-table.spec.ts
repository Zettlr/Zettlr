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
import { deepStrictEqual } from 'assert'
import { buildPipeMarkdownTable } from 'source/common/util/build-pipe-markdown-table'

const table: Array<{ ast: string[][], colAlignments: Array<'left'|'right'|'center'|null> }> = []
const tableResults: string[] = []

/** * * * * * * * * * * * * * * * * * *
* TABLE ONE
*/
tableResults.push(`\
|   |   |
|:--|:--|
|   |   |`)

table.push({
  ast: [
    [ '', '' ],
    [ '', '' ]
  ],
  colAlignments: [ 'left', 'left' ]
})

/** * * * * * * * * * * * * * * * * * *
* TABLE TWO
*/
tableResults.push(`\
|   |   |   |   |
|:--|:--|:--|:--|
|   |   |   |   |
|   |   |   |   |`)

table.push({
  ast: [
    [ '', '', '', '' ],
    [ '', '', '', '' ],
    [ '', '', '', '' ]
  ],
  colAlignments: [ 'left', 'left', 'left', 'left' ]
})

/** * * * * * * * * * * * * * * * * * *
* TABLE THREE
*/
tableResults.push(`\
| Left   | Centered |  Right |
|:-------|:--------:|-------:|
| Col. 1 |  Col. 2  | Col. 3 |`)

table.push({
  ast: [
    [ 'Left', 'Centered', 'Right' ],
    [ 'Col. 1', 'Col. 2', 'Col. 3' ]
  ],
  colAlignments: [ 'left', 'center', 'right' ]
})

/** * * * * * * * * * * * * * * * * * *
* TABLE FOUR
*/
tableResults.push(`\
| One | Two | Three | Four | Five |
|:----|-----|:-----:|------|-----:|
| 1   | 2   |   3   | 4    |    5 |`)

table.push({
  ast: [
    [ 'One', 'Two', 'Three', 'Four', 'Five' ],
    [ '1', '2', '3', '4', '5' ]
  ],
  colAlignments: [ 'left', null, 'center', null, 'right' ]
})

describe('TableEditor#buildGrid()', function () {
  for (let i = 0; i < table.length; i++) {
    it(`Should build test table ${i + 1} correctly`, function () {
      const { ast, colAlignments } = table[i]
      deepStrictEqual(buildPipeMarkdownTable(ast, colAlignments), tableResults[i])
    })
  }
})
