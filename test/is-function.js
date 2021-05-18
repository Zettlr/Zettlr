/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        isFunction tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const isFunction = require('../source/common/util/is-function')
const assert = require('assert')

var variableFunction = () => { return 'world' }

const isFunctionTesters = [
  { 'input': function () { return 'something' }, 'expected': true },
  { 'input': () => { return 'hello' }, 'expected': true },
  { 'input': variableFunction, 'expected': true },
  { 'input': 'A string', 'expected': false },
  { 'input': -1234, 'expected': false }
]

describe('Utility#isFunction()', function () {
  for (let test of isFunctionTesters) {
    it(`should return ${test.expected} for ${test.input.toString()}`, function () {
      assert.strictEqual(isFunction(test.input), test.expected)
    })
  }
})
