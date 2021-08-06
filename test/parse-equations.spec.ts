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

import { findInlineEquations, findEquations, EquationMarker, LineInfo } from '../source/common/modules/markdown-editor/plugins/render-math'
import { deepStrictEqual } from 'assert'

describe('findInlineEquations()', function () {
  it('should recognize equation wrapped in two dollar symbols', function () {
    deepStrictEqual(findInlineEquations('$$asd$$', 0), [new EquationMarker(
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
    deepStrictEqual(findInlineEquations('$asd$', 0), [new EquationMarker(
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
    deepStrictEqual(findInlineEquations('$ asd$', 0), [])
  })

  it('should not recognize when closing dollar is preceded by space', function () {
    deepStrictEqual(findInlineEquations('$ asd$', 0), [])
  })

  it('should not recognize empty equation', function () {
    deepStrictEqual(findInlineEquations('$$', 0), [])
  })

  it('should recognize single character equation wrapped in single dollar symbols', function () {
    deepStrictEqual(findInlineEquations('$a$', 0), [new EquationMarker(
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
    deepStrictEqual(findInlineEquations('$$a$$', 0), [new EquationMarker(
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
    deepStrictEqual(findInlineEquations('$$ad$', 0), [])
  })

  it('should not recognize escaped', function () {
    deepStrictEqual(findInlineEquations('\\$asd\\$', 0), [])
  })
})

describe('findEquations()', function () {
  it('should recognize equation wrapped in two dollar symbols', function () {
    deepStrictEqual(findEquations([new LineInfo(0, '$$asd$$', 'markdown-zkn', '')]), [new EquationMarker(
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
    deepStrictEqual(findEquations([new LineInfo(0, '$asd$', 'markdown-zkn', '')]), [new EquationMarker(
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
    deepStrictEqual(findEquations([new LineInfo(0, '$ asd$', 'markdown-zkn', '')]), [])
  })

  it('should not recognize when closing dollar is preceded by space', function () {
    deepStrictEqual(findEquations([new LineInfo(0, '$ asd$', 'markdown-zkn', '')]), [])
  })

  it('should not recognize empty equation', function () {
    deepStrictEqual(findEquations([new LineInfo(0, '$$', 'markdown-zkn', '')]), [])
  })

  it('should recognize single character equation wrapped in single dollar symbols', function () {
    deepStrictEqual(findEquations([new LineInfo(0, '$a$', 'markdown-zkn', '')]), [new EquationMarker(
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
    deepStrictEqual(findEquations([new LineInfo(0, '$$a$$', 'markdown-zkn', '')]), [new EquationMarker(
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
    deepStrictEqual(findEquations([
      new LineInfo(0, '$$', 'markdown-zkn', ''),
      new LineInfo(1, 'a', 'markdown-zkn', ''),
      new LineInfo(2, '$$', 'markdown-zkn', '')
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
    deepStrictEqual(findEquations([
      new LineInfo(0, '$$', 'markdown-zkn', ''),
      new LineInfo(1, 'a', 'markdown-zkn', ''),
      new LineInfo(2, '$$', 'markdown-zkn', ''),
      new LineInfo(3, '$$', 'markdown-zkn', ''),
      new LineInfo(4, 'b', 'markdown-zkn', ''),
      new LineInfo(5, '$$', 'markdown-zkn', '')
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
    deepStrictEqual(findEquations([new LineInfo(0, '$$ad$', 'markdown-zkn', '')]), [])
  })

  it('should not recognize escaped', function () {
    deepStrictEqual(findEquations([new LineInfo(0, '\\$asd\\$', 'markdown-zkn', '')]), [])
  })
})
