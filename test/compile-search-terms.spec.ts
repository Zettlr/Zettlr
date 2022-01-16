/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        compileSearchTerms tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import compileSearchTerms from '../source/common/util/compile-search-terms'
import assert from 'assert'

const testSearches = [
  // First the searches from the docs
  {
    'terms': 'boat ship',
    'expected': [{ words: ['boat'], operator: 'AND' }, { words: ['ship'], operator: 'AND' }]
  },
  {
    'terms': 'boat | ship',
    'expected': [{ words: [ 'boat', 'ship' ], operator: 'OR' }]
  },
  {
    'terms': '"boat ship"',
    'expected': [{ words: ['boat ship'], operator: 'AND' }]
  },
  {
    'terms': 'test | done rendering',
    expected: [
      { words: [ 'test', 'done' ], operator: 'OR' },
      { words: ['rendering'], operator: 'AND' }
    ]
  },
  // Now some fancy ones!
  {
    'terms': 'sovereignty | "state of exception" Agamben',
    'expected': [
      { words: [ 'sovereignty', 'state of exception' ], operator: 'OR' },
      { words: ['Agamben'], operator: 'AND' }
    ]
  },
  {
    'terms': '"sovereign decision" !"Carl Schmitt"',
    'expected': [
      { words: ['sovereign decision'], operator: 'AND' },
      { words: ['Carl Schmitt'], operator: 'NOT' }
    ]
  },
  {
    'terms': 'this should turn out "really" boring!',
    'expected': [
      { words: ['this'], operator: 'AND' },
      { words: ['should'], operator: 'AND' },
      { words: ['turn'], operator: 'AND' },
      { words: ['out'], operator: 'AND' },
      { words: ['really'], operator: 'AND' },
      { words: ['boring!'], operator: 'AND' }
    ]
  },
  {
    'terms': '',
    'expected': []
  }
]

describe('Utility#compileSearchTerms()', function () {
  for (let test of testSearches) {
    it(`should compile »${test.terms}« correctly.`, function () {
      let result = compileSearchTerms(test.terms)
      assert.deepStrictEqual(test.expected, result)
    })
  }
})
