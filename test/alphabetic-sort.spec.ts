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
import { DirMeta } from '@dts/common/fsal'

const sort = 'AlphaD';

const alphabeticSortTesters = [
  {
    input: [{ name: 'titled', dir: 'Documents' },{ name: 'titled', dir: 'Desktop' }],
    expected: [{ name: 'titled', dir: 'Documents' }, { name: 'titled', dir: 'Desktop' }],
    message : `Should return {name: 'titled', dir: 'Documents' } , { name: 'titled', dir: 'Desktop' }` 
  },
  {
    input: [{ name: 'untitled', dir: 'Downloads' },{ name: 'titled', dir: 'Documents' }],
    expected: [{ name: 'untitled', dir: 'Downloads' }, { name: 'titled', dir: 'Documents' }],
    message : `Should return { name: 'untitled', dir: 'Downloads' } , { name: 'titled', dir: 'Documents' }`
  },
  {
    input: [{ name: 'first', dir: 'Applications' }, { name: 'first', dir: 'Music' }],
    expected: [{ name: 'first', dir: 'Music' }, { name: 'first', dir: 'Applications' }],
    message : `Should return { name: 'first', dir: 'Music' } , { name: 'first', dir: 'Applications' }`
  },
  {
    input: [{ name: 'file', dir: 'Test' },{ name: 'file', dir: 'Beats' }],
    expected: [{ name: 'file', dir: 'Test' }, { name: 'file', dir: 'Beats' }],
    message : `Should return { name: 'file', dir: 'Test' } , { name: 'file', dir: 'Beats' }`
  },
];

describe('Utility#alphabeticSort()', function () {
  for (const test of alphabeticSortTesters) {
    it(`${test.message}`, function () {
      deepStrictEqual(alphabeticSort(test.input as DirMeta[], sort), test.expected);
    });
  }
});
