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

const table: Array<{ ast: string[][], colAlignments: Array<'left'|'right'|'center'> }> = []
const tableResults: string[] = []

/** * * * * * * * * * * * * * * * * * *
* TABLE ONE
*/
tableResults.push(`|  |  |
|--|--|
|  |  |`)

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
tableResults.push(`|  |  |  |  |
|--|--|--|--|
|  |  |  |  |
|  |  |  |  |`)

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
tableResults.push(`| Right | Left  | Centered |
|------:|-------|:--------:|
| Col 1 | Col 2 | Col 3    |`)

table.push({
  ast: [
    [ 'Right', 'Left', 'Centered' ],
    [ 'Col 1', 'Col 2', 'Col 3' ]
  ],
  colAlignments: [ 'right', 'left', 'center' ]
})

describe('TableEditor#buildGrid()', function () {
  for (let i = 0; i < table.length; i++) {
    it(`Should build test table ${i + 1} correctly`, function () {
      const { ast, colAlignments } = table[i]
      deepStrictEqual(buildPipeMarkdownTable(ast, colAlignments), tableResults[i])
    })
  }
})
