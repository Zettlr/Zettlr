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

import { EquationFinder, EquationMarker, LineInfo } from '../source/renderer/modules/markdown-editor/plugins/render-math'
import { deepStrictEqual } from 'assert'

describe('EquationFinder#findInlineEquations()', function () {
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

describe('EquationFinder#findEquations()', function () {
  it('should recognize equation wrapped in two dollar symbols', function () {
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$$asd$$', 'markdown', '')]), [new EquationMarker(
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
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$asd$', 'markdown', '')]), [new EquationMarker(
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
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$ asd$', 'markdown', '')]), [])
  })

  it('should not recognize when closing dollar is preceded by space', function () {
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$ asd$', 'markdown', '')]), [])
  })

  it('should not recognize empty equation', function () {
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$$', 'markdown', '')]), [])
  })

  it('should recognize single character equation wrapped in single dollar symbols', function () {
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$a$', 'markdown', '')]), [new EquationMarker(
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
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$$a$$', 'markdown', '')]), [new EquationMarker(
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

  it('should recognize single character equation wrapped in double dollar symbols on separate lines', function () {
    deepStrictEqual(EquationFinder.findEquations([
      new LineInfo(0, '$$', 'markdown', ''),
      new LineInfo(1, 'a', 'markdown', ''),
      new LineInfo(2, '$$', 'markdown', '')
    ]), [new EquationMarker(
      {
        ch: 0,
        line: 0
      },
      {
        ch: 2,
        line: 2
      },
      'a',
      true
    )])
  })

  it('should recognize multiple equations following each other on separate lines', function () {
    deepStrictEqual(EquationFinder.findEquations([
      new LineInfo(0, '$$', 'markdown', ''),
      new LineInfo(1, 'a', 'markdown', ''),
      new LineInfo(2, '$$', 'markdown', ''),
      new LineInfo(3, '$$', 'markdown', ''),
      new LineInfo(4, 'b', 'markdown', ''),
      new LineInfo(5, '$$', 'markdown', '')
    ]), [ new EquationMarker(
      {
        ch: 0,
        line: 0
      },
      {
        ch: 2,
        line: 2
      },
      'a',
      true
    ), new EquationMarker(
      {
        ch: 0,
        line: 3
      },
      {
        ch: 2,
        line: 5
      },
      'b',
      true
    ) ])
  })

  it('should not recognize not properly closed equation', function () {
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '$$ad$', 'markdown', '')]), [])
  })

  it('should not recognize escaped', function () {
    deepStrictEqual(EquationFinder.findEquations([new LineInfo(0, '\\$asd\\$', 'markdown', '')]), [])
  })
})
