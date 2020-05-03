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

require("../source/renderer/assets/codemirror/zettlr-plugin-render-math");
const assert = require("assert");

describe("Editor#parseEquations()", function () {
  it("should recognize equation wrapped in two dollar symbols", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$$asd$$", 0), [
      {
        curFrom: {
          ch: 0,
          line: 0,
        },
        curTo: {
          ch: 7,
          line: 0,
        },
        displayMode: true,
        eq: "asd",
      },
    ]);
  });

  it("should recognize equation wrapped in single dollar symbols", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$asd$", 0), [
      {
        curFrom: {
          ch: 0,
          line: 0,
        },
        curTo: {
          ch: 5,
          line: 0,
        },
        displayMode: false,
        eq: "asd",
      },
    ]);
  });

  it("should not recognize when opening dollar is followed by space", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$ asd$", 0), []);
  });

  it("should not recognize when closing dollar is preceded by space", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$ asd$", 0), []);
  });

  it("should not recognize empty equation", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$$", 0), []);
  });

  it("should recognize single character equation wrapped in single dollar symbols", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$a$", 0), [
      {
        curFrom: {
          ch: 0,
          line: 0,
        },
        curTo: {
          ch: 3,
          line: 0,
        },
        displayMode: false,
        eq: "a",
      },
    ]);
  });

  it("should recognize single character equation wrapped in double dollar symbols", function () {
    assert.deepEqual(EquationFinder.findInlineEquations("$$a$$", 0), [
      {
        curFrom: {
          ch: 0,
          line: 0,
        },
        curTo: {
          ch: 5,
          line: 0,
        },
        displayMode: true,
        eq: "a",
      },
    ]);
  });

  it("should not recognize not properly closed equation", function () {
    assert.deepEqual(EquationFinder.findInlineEquations('$$ad$', 0), []);
  });

  it("should not recognize escaped", function () {
    assert.deepEqual(EquationFinder.findInlineEquations('\\$asd\\$', 0), []);
  });
});
