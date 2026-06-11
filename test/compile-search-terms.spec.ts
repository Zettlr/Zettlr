/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        compileBooleanQuery tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { compileBooleanQuery, type BooleanTerm } from '../source/app/service-providers/search/util/boolean-search'
import assert from 'assert'

const testSearches: Array<{ query: string, expected: BooleanTerm[] }> = [
  // First the searches from the docs
  {
    query: 'boat ship',
    expected: [{ words: ['boat'], operator: 'AND' }, { words: ['ship'], operator: 'AND' }]
  },
  {
    query: 'boat | ship',
    expected: [{ words: [ 'boat', 'ship' ], operator: 'OR' }]
  },
  {
    query: '"boat ship"',
    expected: [{ words: ['boat ship'], operator: 'AND' }]
  },
  {
    query: 'test | done rendering',
    expected: [
      { words: [ 'test', 'done' ], operator: 'OR' },
      { words: ['rendering'], operator: 'AND' }
    ]
  },
  // Now some fancy ones!
  {
    query: 'sovereignty | "state of exception" Agamben',
    expected: [
      { words: [ 'sovereignty', 'state of exception' ], operator: 'OR' },
      { words: ['agamben'], operator: 'AND' }
    ]
  },
  {
    query: '"sovereign decision" !"Carl Schmitt"',
    expected: [
      { words: ['sovereign decision'], operator: 'AND' },
      { words: ['carl schmitt'], operator: 'NOT' }
    ]
  },
  {
    query: 'this should turn out "really" boring!',
    expected: [
      { words: ['this'], operator: 'AND' },
      { words: ['should'], operator: 'AND' },
      { words: ['turn'], operator: 'AND' },
      { words: ['out'], operator: 'AND' },
      { words: ['really'], operator: 'AND' },
      { words: ['boring!'], operator: 'AND' }
    ]
  },
  {
    query: '',
    expected: []
  }
]

describe('SearchProvider#compileBooleanQuery()', function () {
  for (let test of testSearches) {
    it(`should compile "${test.query}" correctly.`, function () {
      const result = compileBooleanQuery(test.query)
      assert.deepStrictEqual(test.expected, result.terms)
    })
  }
})
