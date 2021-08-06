/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        generateRegexForHighlightMode tester
 * CVM-Role:        TESTING
 * Maintainer:      Ville Kukkonen
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import assert from 'assert'
import generateRegexForHighlightMode from '../source/common/modules/markdown-editor/util/generate-regex-for-highlight-mode'

const testers = [
    { selectors: ['js'], input: '```js', expected: true },
    { selectors: ['js'], input: '```   js', expected: true },
    { selectors: ['js'], input: '~~~js', expected: true },
    { selectors: ['js'], input: '~~~    js', expected: true },
    { selectors: ['js'], input: '```  .js', expected: false },
    { selectors: ['js'], input: '``` {.js}', expected: true },
    { selectors: ['js'], input: '```{.js}', expected: true },
    { selectors: ['js'], input: '```{ #identifier .js', expected: true },
    { selectors: ['fsharp'], input: '``` { #fsharp .js .fsharp', expected: false },
    { selectors: ['fsharp','fs'], input: '~~~ { #id .fs }', expected: true },
    { selectors: ['fsharp'], input: '``` { #fsharp not.fsharp }', expected: false}
]

describe('MarkdownEditor#Utility#generateRegexForHighlightMode()', function () {
    for (let test of testers) {
      it(`with selectors ${test.selectors.toString()} should create a regex for which RegExp#test('${test.input}') returns ${test.expected}`, function () {
        assert.strictEqual(generateRegexForHighlightMode(test.selectors).test(test.input), test.expected)
      })
    }
  })