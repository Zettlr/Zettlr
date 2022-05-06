/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        alphabeticSort tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import alphabeticSort from '../source/win-main/file-manager/util/alphabeticSort';
import { deepStrictEqual } from 'assert';

const sort = 'desc';

const alphabeticSortTesters = [
  {
    input: [{ name: 'titled', dir: 'Documents' },{ name: 'titled', dir: 'Desktop' },],
    expected: [{ name: 'titled', dir: 'Documents' }, { name: 'titled', dir: 'Desktop' },],
  },
  {
    input: [{ name: 'untitled', dir: 'Downloads' },{ name: 'titled', dir: 'Documents' }],
    // { name: 'untitled', dir: 'Downloads' },{ name: 'titled', dir: 'Documents' }
    expected: [{ name: 'titled', dir: 'Documents' }, { name: 'untitled', dir: 'Downloads' }],
  },
  {
    input: [{ name: 'first', dir: 'Applications' }, { name: 'first', dir: 'Music' }],
    expected: [{ name: 'first', dir: 'Music' }, { name: 'first', dir: 'Applications' }],
  },
  // {
  //   input: [{ name: 'first', dir: 'desktop' },{ name: 'first', dir: 'document' }],
  //   expected: [{ name: 'first', dir: 'document' }, { name: 'first', dir: 'desktop' }],
  // },
];

describe('Utility#alphabeticSort()', function () {
  for (const test of alphabeticSortTesters) {
    it(`Input "${test.input}" should return "${test.expected}"`, function () {
      const result = alphabeticSort(test.input, sort);
      console.log('resultresultresult', result);
      console.log('test.expectedtest.expected', test.expected);
      deepStrictEqual(result, test.expected);
    });
  }
});
