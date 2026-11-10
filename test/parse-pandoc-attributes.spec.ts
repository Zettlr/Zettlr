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
  { input: 'width=50%', output: { properties: { width: '50%' } } }, // Attributes without braces
  { input: '{width=50%}', output: { properties: { width: '50%' } } }, // Simple parsing
  { input: ' width = 50% ', output: {} }, // Spaces between = not supported
  { input: '{ width= 50% }', output: {} }, // Spaces between = not supported
  { input: '{ width =50% }', output: {} }, // Spaces between = not supported
  { input: '{width=10}', output: { properties: { width: '10px' } } }, // Parsing width without unit
  { input: '{height=75}', output: { properties: { height: '75px' } } }, // Parsing height without unit
  { input: '{key="some long value"}', output: { properties: { key: 'some long value' } } }, // Parsing quoted values
  { input: '{key=some long value}', output: { properties: { key: 'some' } } }, // Parsing malformed unquoted values
  { input: "{key='some long value'}", output: { properties: { key: 'some long value' } } }, // Parsing single-quoted values
  { input: '{-}', output: { classes: ['unnumbered'] } }, // Bare `-` is shorthand for `.unnumbered`
  { input: '{#intro -}', output: { id: 'intro', classes: ['unnumbered'] } }, // Bare `-` alongside other attributes
  { input: '{key=some-value}', output: { properties: { key: 'some-value' } } }, // Hyphens inside values are not `-`
  { input: '{#fig:overview}', output: { id: 'fig:overview' } }, // IDs may contain colons (e.g., pandoc-crossref)
  { input: "{key='a\"b'}", output: { properties: { key: 'a"b' } } }, // Single-quoted values may contain double quotes
  { input: "{.a key='x y' -}", output: { classes: [ 'a', 'unnumbered' ], properties: { key: 'x y' } } }, // Mixed forms
  { input: '{--}', output: { classes: ['unnumbered'] } }, // Any run of `-` means unnumbered, like in Pandoc
  { input: '{.fig.wide}', output: { classes: ['fig.wide'] } }, // Classes may contain dots, like in Pandoc
  { input: '{-x}', output: {} }, // `-` followed by other text is not unnumbered
  { input: '{--x}', output: {} }, // Same for a longer run of `-`
  { input: '{-.foo#bar .foo -}', output: { id: 'bar', classes: [ 'unnumbered', 'foo', 'foo', 'unnumbered' ] } }, // No whitespace needed between attributes
  {
    // Longer test with all available classes
    input: '#some-id .class1 .class2 width=50% height=25 disabled=false style="font-size: 12px;"',
    output: {
      id: 'some-id',
      classes: ['class1', 'class2'],
      properties: {
        width: '50%',
        height: '25px',
        disabled: 'false',
        style: 'font-size: 12px;'
      }
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
    it(`should parse the attribute string "${test.input}"`, function () {
      deepStrictEqual(parsePandocAttributes(test.input), test.output)
    })
  }
})
