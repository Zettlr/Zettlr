/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        hash tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * Author:          Christian Bauer
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import hash from '../source/common/util/hash'

const hashTesters = [
  {
    input: '',
    expectedValue: 0
  },
  {
    input: '1',
    expectedValue: 49
  },
  {
    input: '2',
    expectedValue: 50
  },
  {
    input: 'a',
    expectedValue: 97
  },
  {
    input: 'ab',
    expectedValue: 3105
  },
  {
    input: 'test',
    expectedValue: 3556498
  },
  {
    input: 'test case',
    expectedValue: -1238814210
  }
]

describe('Utility#hash()', function () {
  for (let test of hashTesters) {
    it(`should return the value ${test.expectedValue}`, () => {
      strictEqual(hash(test.input), test.expectedValue)
    })
  }
})
