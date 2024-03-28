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
        composite: false,
        source: '[@doe99; @smith2000; @smith2004]',
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
        composite: false,
        source: '[see @doe99, pp. 33-35 and *passim*; @smith04, chap. 1]',
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
        composite: false,
        source: '[@{https://example.com/bib?name=foobar&date=2000}, p. 33]',
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
        composite: false,
        source: '[@smith{ii, A, D-Z}, with a suffix]',
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
        composite: false,
        source: '[@smith, {pp. iv, vi-xi, (xv)-(xvii)} with suffix here]',
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
        composite: false,
        source: '[@smith{}, 99 years later]',
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
        composite: false,
        source: '[-@smith04]',
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
        composite: true,
        source: '@smith04',
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
        composite: true,
        source: '@smith04',
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
        composite: true,
        source: '@smith04 [p. 33]',
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
        composite: true,
        source: '@{https://example.com/bib?name=foobar&date=2000}',
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
        composite: true,
        source: '@{https://example.com/bib?name=foobar&date=2000} [p. 33]',
        citations: [{ ...defaults, id: 'https://example.com/bib?name=foobar&date=2000', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts an in-text citation with a URL as citekey and optional locator/suffix'
  },
  // The next tests check that locators without explicit page number are detected
  {
    input: '@{https://example.com/bib?name=foobar&date=2000} [33] says blah.',
    expected: [
      {
        from: 0,
        to: 53,
        composite: true,
        source: '@{https://example.com/bib?name=foobar&date=2000} [33]',
        citations: [{ ...defaults, id: 'https://example.com/bib?name=foobar&date=2000', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts an in-text citation with a URL as citekey and locator without explicit label'
  },
  {
    input: '@Author2015 [33] says blah.',
    expected: [
      {
        from: 0,
        to: 16,
        composite: true,
        source: '@Author2015 [33]',
        citations: [{ ...defaults, id: 'Author2015', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts an in-text citation with a regular citekey and locator without explicit label'
  },
  {
    input: 'Someone [@Author2015, 33] says blah.',
    expected: [
      {
        from: 8,
        to: 25,
        composite: false,
        source: '[@Author2015, 33]',
        citations: [{ ...defaults, id: 'Author2015', label: 'page', locator: '33', suffix: '' }]
      }
    ],
    description: 'extracts a regular citation with a regular citekey and locator without explicit label'
  },
  {
    input: 'Someone [@Author2015, 33 and someplace else] says blah.',
    expected: [
      {
        from: 8,
        to: 44,
        composite: false,
        source: '[@Author2015, 33 and someplace else]',
        citations: [{ ...defaults, id: 'Author2015', label: 'page', locator: '33', suffix: 'and someplace else' }]
      }
    ],
    description: 'extracts a regular citation with locator without explicit label and a suffix'
  },
  {
    input: 'Someone [@Author2015, ix-xi and someplace else] says blah.',
    expected: [
      {
        from: 8,
        to: 47,
        composite: false,
        source: '[@Author2015, ix-xi and someplace else]',
        citations: [{ ...defaults, id: 'Author2015', label: 'page', locator: 'ix-xi', suffix: 'and someplace else' }]
      }
    ],
    description: 'extracts a citations and locators with latin numbers and a suffix'
  },
  {
    input: '@GrewalNetworkPower2009\n[@gallowayProtocolHowControl2004]',
    expected: [
      {
        citations: [{
          id: 'GrewalNetworkPower2009',
          label: 'page',
          locator: undefined,
          prefix: undefined,
          suffix: undefined,
          'suppress-author': false
        }],
        composite: true,
        from: 0,
        to: 23,
        source: '@GrewalNetworkPower2009'
      },
      {
        citations: [{
          id: 'gallowayProtocolHowControl2004',
          label: 'page',
          locator: undefined,
          prefix: undefined,
          suffix: undefined,
          'suppress-author': false
        }],
        composite: false,
        from: 24,
        source: '[@gallowayProtocolHowControl2004]',
        to: 57
      }
    ],
    description: 'tests for an edge case of a barebones citation, followed by a newline and a bracket-citation'
  }
]

describe('extractCitations()', function () {
  for (const test of tests) {
    it(test.description, function () {
      assert.deepStrictEqual(extractCitations(test.input), test.expected)
    })
  }
})
