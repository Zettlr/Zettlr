/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseLinkAttributes tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { deepStrictEqual } from 'assert'
import { ParsedPandocAttributes, parsePandocAttributes } from 'source/common/pandoc-util/parse-pandoc-attributes'

const tests: Array<{ input: string, output: ParsedPandocAttributes|'logs-error' }> = [
  { input: 'width=50%', output: 'logs-error' }, // Missing braces. See NOTE below.
  { input: '{width=50%}', output: { width: '50%' } }, // Simple parsing
  { input: '{ width = 50% }', output: {} }, // Spaces between = not supported
  { input: '{ width= 50% }', output: {} }, // Spaces between = not supported
  { input: '{ width =50% }', output: {} }, // Spaces between = not supported
  { input: '{width=10}', output: { width: '10px' }}, // Parsing width without unit
  { input: '{height=75}', output: { height: '75px' } }, // Parsing height without unit
  { input: '{key="some long value"}', output: { properties: { key: 'some long value' } } }, // Parsing quoted values
  { input: '{key=some long value}', output: { properties: { key: 'some' } } }, // Parsing malformed unquoted values
  {
    // Longer test with all available classes
    input: '{#some-id .class1 .class2 width=50% height=25 disabled=false style="font-size: 12px;"}',
    output: {
      id: 'some-id',
      classes: ['class1', 'class2'],
      width: '50%',
      height: '25px',
      properties: { disabled: 'false', style: 'font-size: 12px;' }
    }
  },
  // Another unsupported property
  { input: '{#some-id .class1 unsupported-property style="font-size: 12px;"}',
    output: {
      id: 'some-id',
      classes: ['class1'],
      properties: { style: 'font-size: 12px;' }
    }
  }
]

describe('Utility#parsePandocAttributes()', function () {
  for (const test of tests) {
    // NOTE: Changed on January 10, 2026 by Hendrik Erz. Reason: Parsing link
    // attributes should not throw errors, since this function is also called in
    // parsing contexts, and throwing errors would completely abort the parsing,
    // rendering entirely white documents that cannot be edited. Instead, the
    // function has been changed to simply return an empty record and log the
    // error to the console.
    if (test.output === 'logs-error') {
      it(`should log an error for string "${test.input}"`, function () {
        const oldError = console.error
        let hasLoggedError = false
        console.error = (...args) => {
          if (args[0] instanceof Error) hasLoggedError = true
        }
        parsePandocAttributes(test.input)
        deepStrictEqual(hasLoggedError, true)
        console.error = oldError
      })
    } else {
      it(`should parse the attribute string "${test.input}"`, function () {
        deepStrictEqual(parsePandocAttributes(test.input), test.output)
      })
    }
  }
})
