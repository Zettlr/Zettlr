/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        equation parser tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { EquationFinder, EquationMarker } from '../source/renderer/modules/markdown-editor/plugins/render-math'
import { deepStrictEqual } from 'assert'

describe('Editor#parseEquations()', function () {
  it('should recognize equation wrapped in two dollar symbols', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$$asd$$', 0), [new EquationMarker(
      {
        ch: 0,
        line: 0
      },
      {
        ch: 7,
        line: 0
      },
      'asd',
      true
    )])
  })

  it('should recognize equation wrapped in single dollar symbols', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$asd$', 0), [new EquationMarker(
      {
        ch: 0,
        line: 0
      },
      {
        ch: 5,
        line: 0
      },
      'asd',
      false
    )])
  })

  it('should not recognize when opening dollar is followed by space', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$ asd$', 0), [])
  })

  it('should not recognize when closing dollar is preceded by space', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$ asd$', 0), [])
  })

  it('should not recognize empty equation', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$$', 0), [])
  })

  it('should recognize single character equation wrapped in single dollar symbols', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$a$', 0), [new EquationMarker(
      {
        ch: 0,
        line: 0
      },
      {
        ch: 3,
        line: 0
      },
      'a',
      false
    )])
  })

  it('should recognize single character equation wrapped in double dollar symbols', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$$a$$', 0), [new EquationMarker(
      {
        ch: 0,
        line: 0
      },
      {
        ch: 5,
        line: 0
      },
      'a',
      true
    )])
  })

  it('should not recognize not properly closed equation', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('$$ad$', 0), [])
  })

  it('should not recognize escaped', function () {
    deepStrictEqual(EquationFinder.findInlineEquations('\\$asd\\$', 0), [])
  })
})
