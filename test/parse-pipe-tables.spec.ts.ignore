/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        pipeParser tests
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import parsePipeTable from '../source/common/modules/markdown-editor/table-editor/parse-pipe'
import { deepStrictEqual, throws } from 'assert'

const table: string[] = []
const tableResults: Array<{ ast: string[][], colAlignments: string[] }> = []

/** * * * * * * * * * * * * * * * * * *
 * TABLE ONE
 */
table.push(`| Heading | Second th |Something with no spacing| Last   |
| :- | --- | --- |:-:|
|Content | over |Content | with irregular spacing |
| Second | Row | With | Normal Spacing |`)

tableResults.push({
  'ast': [
    [ 'Heading', 'Second th', 'Something with no spacing', 'Last' ],
    [ 'Content', 'over', 'Content', 'with irregular spacing' ],
    [ 'Second', 'Row', 'With', 'Normal Spacing' ]
  ],
  'colAlignments': [ 'left', 'left', 'left', 'center' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE TWO
 */
table.push(`fruit| price
-----|-----:
apple|2.05
pear|1.37
orange|3.09`)

tableResults.push({
  'ast': [
    [ 'fruit', 'price' ],
    [ 'apple', '2.05' ],
    [ 'pear', '1.37' ],
    [ 'orange', '3.09' ]
  ],
  'colAlignments': [ 'left', 'right' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE THREE
 */
table.push(`| One | Two   |
|-----+-------|
| my  | table |
| is  | nice  |`)

tableResults.push({
  'ast': [
    [ 'One', 'Two' ],
    [ 'my', 'table' ],
    [ 'is', 'nice' ]
  ],
  'colAlignments': [ 'left', 'left' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE FOUR
 */
table.push(`| Var | Jp | UK |
|:----|---:|---:|
| *n* |  1 |  2 |
| Av  |  1 |  8 |`)

tableResults.push({
  'ast': [
    [ 'Var', 'Jp', 'UK' ],
    [ '*n*', '1', '2' ],
    [ 'Av', '1', '8' ]
  ],
  'colAlignments': [ 'left', 'right', 'right' ]
})

const TABLE_ERROR_1 = `| Unequal | cols | table | here |
| - | - | - | - |
| should | throw | an |
| error | because | wrong | col number |`

describe('TableEditor#pipeParser()', function () {
  for (let i = 0; i < table.length; i++) {
    it(`Should parse the test table ${i + 1} correctly`, function () {
      deepStrictEqual(parsePipeTable(table[i]), tableResults[i])
    })
  }

  it('Should throw an error when attempting to parse mismatched columns', function () {
    throws(function () { parsePipeTable(TABLE_ERROR_1) })
  })
})
