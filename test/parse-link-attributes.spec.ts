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

import { deepStrictEqual, throws } from 'assert'
import { ParsedPandocLinkAttributes, parseLinkAttributes } from 'source/common/pandoc-util/parse-link-attributes'

const tests: Array<{ input: string, output: ParsedPandocLinkAttributes|'throws' }> = [
  { input: 'width=50%', output: 'throws' }, // Missing braces
  { input: '{width=50%}', output: { width: '50%' } }, // Simple parsing
  { input: '{ width = 50% }', output: {} }, // Spaces between = not supported
  { input: '{width=10}', output: { width: '10px' }}, // Parsing width without unit
  { input: '{height=75}', output: { height: '75px' } }, // Parsing height without unit
  {
    // Longer test with all available classes
    input: '{#some-id .class1 .class2 width=50% height=25 disabled=false}',
    output: {
      id: 'some-id', classes: ['class1', 'class2'], width: '50%', height: '25px', properties: { disabled: 'false' }
    }
  },
  // Another unsupported property
  { input: '{#some-id .class1 unsupported-property }', output: { id: 'some-id', classes: ['class1'] } }
]

describe('Utility#parseLinkAttributes()', function () {
  for (const test of tests) {
    if (test.output === 'throws') {
      it(`should throw an error for string "${test.input}"`, function () {
        throws(() => parseLinkAttributes(test.input))
      })
    } else {
      it(`should parse the attribute string "${test.input}"`, function () {
        deepStrictEqual(parseLinkAttributes(test.input), test.output)
      })
    }
  }
})
