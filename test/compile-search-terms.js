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

const compileSearchTerms = require('../source/common/util/compile-search-terms')
const assert = require('assert')

const testSearches = [
  // First the searches from the docs
  {
    'terms': 'boat ship',
    'expected': [{ word: 'boat', operator: 'AND' }, { word: 'ship', operator: 'AND' }]
  },
  {
    'terms': 'boat | ship',
    'expected': [{ word: [ 'boat', 'ship' ], operator: 'OR' }]
  },
  {
    'terms': '"boat ship"',
    'expected': [{ word: 'boat ship', operator: 'AND' }]
  },
  // Now some fancy ones!
  {
    'terms': 'sovereignty | "state of exception" Agamben',
    'expected': [
      { word: [ 'sovereignty', 'state of exception' ], operator: 'OR' },
      { word: 'Agamben', operator: 'AND' }
    ]
  },
  {
    'terms': '"sovereign decision" !"Carl Schmitt"',
    'expected': [
      { word: 'sovereign decision', operator: 'AND' },
      { word: 'Carl Schmitt', operator: 'NOT' }
    ]
  },
  {
    'terms': 'this should turn out "really" boring!',
    'expected': [
      { word: 'this', operator: 'AND' },
      { word: 'should', operator: 'AND' },
      { word: 'turn', operator: 'AND' },
      { word: 'out', operator: 'AND' },
      { word: 'really', operator: 'AND' },
      { word: 'boring!', operator: 'AND' }
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
