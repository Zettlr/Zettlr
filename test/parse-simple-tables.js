/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        simpleParser tests
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const simpleParser = require('../source/renderer/util/table-parser-simple')
const assert = require('assert')

const table = []
const tableResults = []

/** * * * * * * * * * * * * * * * * * *
 * TABLE ONE
 */
table.push(`  Right     Left     Center     Default
-------     ------ ----------   -------
     12     12        12            12
    123     123       123          123
      1     1          1             1`)

tableResults.push({
  ast: [
    [ 'Right', 'Left', 'Center', 'Default' ],
    [ '12', '12', '12', '12' ],
    [ '123', '123', '123', '123' ],
    [ '1', '1', '1', '1' ]
  ],
  colAlignments: [ 'right', 'left', 'center', 'left' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE TWO
 */
table.push(`-------     ------ ----------   -------
     12     12        12             12
    123     123       123           123
      1     1          1              1
-------     ------ ----------   -------`)

tableResults.push({
  ast: [
    [ '12', '12', '12', '12' ],
    [ '123', '123', '123', '123' ],
    [ '1', '1', '1', '1' ]
  ],
  colAlignments: [ 'right', 'left', 'center', 'right' ]
})

/** * * * * * * * * * * * * * * * * * *
 * TABLE THREE
 */
table.push(`Datum        PC   XP      Gold   XP/PC   Gold/PC
------------ ---- ------- ------ ------- ---------
11.04.2019   6    175     0      29      0
21.05.2019   6    1950    25     325     4,166
24.06.2019   6    2350    0      392     0
08.08.2019   6    2250    100    375     16,666
23.09.2019   6    1000    312    167     52
21.11.2019   6    2626    5      438     0,833
02.12.2019   6    3450    81     575     13,500
21.01.2020   6    2575    1472   429     245,333
Gesamt            17176   4595   2863    765,833`)

tableResults.push({
  ast: [
    [ 'Datum', 'PC', 'XP', 'Gold', 'XP/PC', 'Gold/PC' ],
    [ '11.04.2019', '6', '175', '0', '29', '0' ],
    [ '21.05.2019', '6', '1950', '25', '325', '4,166' ],
    [ '24.06.2019', '6', '2350', '0', '392', '0' ],
    [ '08.08.2019', '6', '2250', '100', '375', '16,666' ],
    [ '23.09.2019', '6', '1000', '312', '167', '52' ],
    [ '21.11.2019', '6', '2626', '5', '438', '0,833' ],
    [ '02.12.2019', '6', '3450', '81', '575', '13,500' ],
    [ '21.01.2020', '6', '2575', '1472', '429', '245,333' ],
    [ 'Gesamt', '', '17176', '4595', '2863', '765,833' ]
  ],
  colAlignments: [ 'left', 'left', 'left', 'left', 'left', 'left' ]
})

describe('TableEditor#simpleParser()', function () {
  for (let i = 0; i < table.length; i++) {
    it(`Should parse test table ${i + 1} correctly`, function () {
      assert.deepStrictEqual(simpleParser(table[i]), tableResults[i])
    })
  }
})
