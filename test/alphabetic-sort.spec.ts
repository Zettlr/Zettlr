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
 import assert from 'assert'
 
 const sort = 'desc'

 const alphabeticSortTesters = [
  
   { input: ['first', 'second', 'last', 'zuisn', 'example'], expected: ['example', 'first', 'last', 'second', 'zuisn'] },
   { input: ['new', 'aight', 'test', 'plant', 'which'], expected: ['aight', 'new', 'plant', 'test', 'which'] },
   { input: ['untitled', 'titled'], expected: ['titled', 'untitled'] },
   { input: ['one', 'two', 'three'], expected: ['one', 'three', 'two'] },
   { input: ['B', 'A'], expected: ['A', 'B'] }


      
 ]
 
 describe('Utility#alphabeticSort()', function () {
   for (const test of alphabeticSortTesters) {
     it(`Input "${test.input}" should return "${test.expected}"`, function () {
       assert.strictEqual(alphabeticSort(test.input, sort), test.expected)
     })
   }
 })
 
