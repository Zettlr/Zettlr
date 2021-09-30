/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        extractCitations test
 * CVM-Role:        Unit Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This tests the ability of Zettlr to extract citations
 *
 * END HEADER
 */

import assert from 'assert'
import extractCitations from '../source/common/util/extract-citations'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// interface CiteItem {
//   id: string
//   locator?: string
//   label?: string
//   'suppress-author'?: boolean
//   'author-only'?: boolean
//   prefix?: string
//   suffix?: string
// }

const defaults = {
  'suppress-author': false,
  label: 'page',
  locator: undefined,
  prefix: undefined,
  suffix: undefined
}

const tests = [
  {
    input: 'Blah blah [@doe99; @smith2000; @smith2004].',
    expected: [
      {
        from: 10,
        to: 42,
        citations: [{ ...defaults, id: 'doe99' }, { ...defaults, id: 'smith2000' }, { ...defaults, id: 'smith2004' }]
      }
    ],
    description: 'extracts a regular, full citation containing three IDs'
  },
  {
    input: 'Blah blah [see @doe99, pp. 33-35 and *passim*; @smith04, chap. 1].',
    expected: [
      {
        from: 10,
        to: 65,
        citations: [
          { ...defaults, id: 'doe99', prefix: 'see', label: 'page', locator: '33-35', suffix: 'and *passim*' },
          { ...defaults, id: 'smith04', label: 'chapter', locator: '1', suffix: '' }
        ]
      }
    ],
    description: 'extracts a regular, full citation with prefixes, suffixes, and locators'
  },
  {
    input: '[@{https://example.com/bib?name=foobar&date=2000}, p. 33]',
    expected: [
      {
        from: 0,
        to: 57,
        citations: [{ ...defaults, id: 'https://example.com/bib?name=foobar&date=2000', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts a regular, full citation with an URL as citekey'
  },
  {
    input: '[@smith{ii, A, D-Z}, with a suffix]',
    expected: [
      {
        from: 0,
        to: 35,
        citations: [{ ...defaults, id: 'smith', label: 'page', locator: 'ii, A, D-Z', suffix: 'with a suffix' }]
      }
    ],
    description: 'extracts a regular, full citation with an explicit locator in curly braces'
  },
  {
    input: '[@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here]',
    expected: [
      {
        from: 0,
        to: 55,
        citations: [{ ...defaults, id: 'smith', label: 'page', locator: 'iv, vi-xi, (xv)-(xvii)', suffix: 'with suffix here' }]
      }
    ],
    description: 'extracts a regular, full citation with an explicit locator in the suffix'
  },
  {
    input: '[@smith{}, 99 years later]',
    expected: [
      {
        from: 0,
        to: 26,
        citations: [{ ...defaults, id: 'smith', label: 'page', suffix: '99 years later', locator: '' }]
      }
    ],
    description: 'extracts a regular, full citation with an empty explicit locator to prevent suffix parsing'
  },
  {
    input: 'Smith says blah [-@smith04].',
    expected: [
      {
        from: 16,
        to: 27,
        citations: [{ ...defaults, id: 'smith04', 'suppress-author': true, prefix: '' }]
      }
    ],
    description: 'extracts a regular, full citation with author suppression'
  },
  {
    input: 'One other citation where Smith says -@smith04',
    expected: [
      {
        from: 36,
        to: 45,
        citations: [{ ...defaults, id: 'smith04', 'suppress-author': true }]
      }
    ],
    description: 'extracts an in-text citation with author suppression'
  },
  {
    input: '@smith04 says blah.',
    expected: [
      {
        from: 0,
        to: 8,
        citations: [{ ...defaults, id: 'smith04' }]
      }
    ],
    description: 'extracts an in-text citation'
  },
  {
    input: '@smith04 [p. 33] says blah.',
    expected: [
      {
        from: 0,
        to: 16,
        citations: [{ ...defaults, id: 'smith04', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts an in-text citation with optional locator/suffix'
  },
  {
    input: '@{https://example.com/bib?name=foobar&date=2000} says blah.',
    expected: [
      {
        from: 0,
        to: 48,
        citations: [{ ...defaults, id: 'https://example.com/bib?name=foobar&date=2000' }]
      }
    ],
    description: 'extracts an in-text citation with a URL as citekey'
  },
  {
    input: '@{https://example.com/bib?name=foobar&date=2000} [p. 33] says blah.',
    expected: [
      {
        from: 0,
        to: 56,
        citations: [{ ...defaults, id: 'https://example.com/bib?name=foobar&date=2000', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts an in-text citation with a URL as citekey and optional locator/suffix'
  }
]

describe('extractCitations()', function () {
  for (const test of tests) {
    it(test.description, function () {
      assert.deepStrictEqual(extractCitations(test.input), test.expected)
    })
  }
})
