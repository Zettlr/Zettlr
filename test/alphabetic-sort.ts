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

 import alphabeticSort from '../source/win-main/file-manager/util/alphabeticSort'
 import { strictEqual } from 'assert'
 
 const sort = 'asc'

 const alphabeticSortTesters = [
  
   { 'input': ["first", "second", "last", "zuisn", "example"], 'expected': ['example', 'first', 'last', 'second', 'zuisn'] },
   {},
   {},
 ]
 
 describe('Utility#alphabeticSort()', function () {
   for (let test of alphabeticSortTesters) {
     it(`Input "${test.input}" should return "${test.expected}"`, function () {
       strictEqual(alphabeticSort(test.input, sort), test.expected)
     })
   }
 })
 
