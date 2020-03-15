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

const pipeParser = require('../source/renderer/util/table-parser-pipe')
const assert = require('assert')

const TABLE_NORMAL = `| Heading | Second th |Something with no spacing| Last   |
| :- | --- | --- |:-:|
|Content | over |Content | with irregular spacing |
| Second | Row | With | Normal Spacing |`

const TABLE_NORMAL_RESULT = {
  'ast': [
    [ 'Heading', 'Second th', 'Something with no spacing', 'Last' ],
    [ 'Content', 'over', 'Content', 'with irregular spacing' ],
    [ 'Second', 'Row', 'With', 'Normal Spacing' ]
  ],
  'colAlignments': [ 'left', 'left', 'left', 'center' ]
}

const TABLE_ERROR_1 = `| Unequal | cols | table | here |
| - | - | - | - |
| should | throw | an |
| error | because | wrong | col number |`

describe('TableEditor#pipeParser()', function () {
  it('Should parse a normal pipe table with irregular spacings correctly', function () {
    assert.deepStrictEqual(pipeParser(TABLE_NORMAL), TABLE_NORMAL_RESULT)
  })

  it('Should throw an error when attempting to parse mismatched columns', function () {
    assert.throws(function () { pipeParser(TABLE_ERROR_1) })
  })
})
