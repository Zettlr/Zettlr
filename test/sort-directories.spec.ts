/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        sortDirectories tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import sortDirectories from '../source/win-main/file-manager/util/sort-directories'
import { deepStrictEqual } from 'assert'
import { DirMeta } from '@dts/common/fsal'

const sort = 'AlphaD'

const sortDirectoriesTesters = [
  {
    input: [{ name: 'titled', dir: 'Documents' }, { name: 'titled', dir: 'Desktop' }],
    expected: [{ name: 'titled', dir: 'Documents' }, { name: 'titled', dir: 'Desktop' }],
    message: `Should return {name: 'titled', dir: 'Documents' } , { name: 'titled', dir: 'Desktop' }` 
  },
  {
    input: [{ name: 'untitled', dir: 'Downloads' }, { name: 'titled', dir: 'Documents' }],
    expected: [{ name: 'untitled', dir: 'Downloads' }, { name: 'titled', dir: 'Documents' }],
    message: `Should return { name: 'untitled', dir: 'Downloads' } , { name: 'titled', dir: 'Documents' }`
  },
  {
    input: [{ name: 'first', dir: 'Applications' }, { name: 'first', dir: 'Music' }],
    expected: [{ name: 'first', dir: 'Music' }, { name: 'first', dir: 'Applications' }],
    message: `Should return { name: 'first', dir: 'Music' } , { name: 'first', dir: 'Applications' }`
  },
  {
    input: [{ name: 'file', dir: 'Test' }, { name: 'file', dir: 'Beats' }],
    expected: [{ name: 'file', dir: 'Test' }, { name: 'file', dir: 'Beats' }],
    message: `Should return { name: 'file', dir: 'Test' } , { name: 'file', dir: 'Beats' }`
  },
  {
    input: [{ name: 'Root', dir: '/home/B' }, { name: 'Root', dir: '/home/D' }, { name: 'Root', dir: '/home/C' }, { name: 'Root', dir: '/home/A' }],
    expected: [{ name: 'Root', dir: '/home/D' }, { name: 'Root', dir: '/home/C' }, { name: 'Root', dir: '/home/B' }, { name: 'Root', dir: '/home/A' }],
    message: `Should return { name: 'Root', dir: '/home/D' }, { name: 'Root', dir: '/home/C' }, { name: 'Root', dir: '/home/B' }, { name: 'Root', dir: '/home/A' }`
  }
]

describe('Utility#sortDirectories()', function () {
  for (const test of sortDirectoriesTesters) {
    it(`${test.message}`, function () {
      deepStrictEqual(sortDirectories(test.input as DirMeta[], sort), test.expected)
    })
  }
})
