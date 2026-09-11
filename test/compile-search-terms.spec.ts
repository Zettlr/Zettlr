/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        compileBooleanQuery tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { MDFileDescriptor } from 'source/types/common/fsal'
import { compileBooleanQuery, searchFileBoolean, SearchQueryBoolean, type BooleanTerm } from '../source/app/service-providers/search/util/boolean-search'
import assert from 'assert'

const testSearches: Array<{ query: string, expected: BooleanTerm[] }> = [
  // First the searches from the docs
  {
    query: 'boat ship',
    expected: [{ words: ['boat'], operator: 'AND' }, { words: ['ship'], operator: 'AND' }]
  },
  {
    query: 'boat | ship',
    expected: [{ words: [ 'boat', 'ship' ], operator: 'OR' }]
  },
  {
    query: '"boat ship"',
    expected: [{ words: ['boat ship'], operator: 'AND' }]
  },
  {
    query: 'test | done rendering',
    expected: [
      { words: [ 'test', 'done' ], operator: 'OR' },
      { words: ['rendering'], operator: 'AND' }
    ]
  },
  // Now some fancy ones!
  {
    query: 'sovereignty | "state of exception" Agamben',
    expected: [
      { words: [ 'sovereignty', 'state of exception' ], operator: 'OR' },
      { words: ['agamben'], operator: 'AND' }
    ]
  },
  {
    query: '"sovereign decision" !"Carl Schmitt"',
    expected: [
      { words: ['sovereign decision'], operator: 'AND' },
      { words: ['carl schmitt'], operator: 'NOT' }
    ]
  },
  {
    query: 'this should turn out "really" boring!',
    expected: [
      { words: ['this'], operator: 'AND' },
      { words: ['should'], operator: 'AND' },
      { words: ['turn'], operator: 'AND' },
      { words: ['out'], operator: 'AND' },
      { words: ['really'], operator: 'AND' },
      { words: ['boring!'], operator: 'AND' }
    ]
  },
  {
    query: '',
    expected: []
  }
]

describe('SearchProvider#compileBooleanQuery()', function () {
  for (let test of testSearches) {
    it(`should compile "${test.query}" correctly.`, function () {
      const result = compileBooleanQuery(test.query)
      assert.deepStrictEqual(test.expected, result.terms)
    })
  }
})

describe('SearchProvider#searchFileBoolean()', function () {
  const descriptor: MDFileDescriptor = {
    dir: '/home/laurent/Documents/Zettlr Tutorial',
    path: '/home/laurent/Documents/Zettlr Tutorial/references.md',
    name: 'references.md',
    ext: '.md',
    size: 6348,
    id: '',
    tags: ['zotero', 'jabref', 'csl json', 'bibtex', 'reference management'],
    links: [],
    citekeys: [],
    bom: '',
    type: 'file',
    wordCount: 833,
    charCount: 5181,
    modtime: 1787142034211.494,
    creationtime: 1787142034211.494,
    linefeed: ``,
    firstHeading: 'Les références avec Zettlr 💬',
    yamlTitle: 'Les références avec Zettlr',
    frontmatter: {
      title: 'Les références avec Zettlr',
      keywords: [
        'Zotero',
        'JabRef',
        'CSL JSON',
        'BibTex',
        'Reference Management',
      ],
    },
  };
  const fileContent: string = `---
title: "Les références avec Zettlr"
keywords:
- Zotero
- JabRef
- Reference Management
...

# Les références avec Zettlr
Dans ce dernier guide, nous nous plongerons dans l'art de citer des références automatiquement en utilisant Zettlr !
`;

  it('should return correct count excerpt of simple search', function () {
    const query: SearchQueryBoolean = {
      type: 'boolean',
      caseInsensitive: true,
      terms: [
        {
          words: ['zettlr'],
          operator: 'AND',
        },
      ],
    };

    const searchResult = searchFileBoolean(descriptor, fileContent, query);
    assert.equal(searchResult.length, 3);
  });

  it('should return correct count excerpt of NOT search', function () {
    const query: SearchQueryBoolean = {
      type: 'boolean',
      caseInsensitive: true,
      terms: [
        {
          words: ['NOT zettlr'],
          operator: 'AND',
        },
      ],
    };

    const searchResult = searchFileBoolean(descriptor, fileContent, query);
    assert.equal(searchResult.length, 0);
  });

  it('should return correct count excerpt of OR search', function () {
    const query: SearchQueryBoolean = {
      type: 'boolean',
      caseInsensitive: true,
      terms: [
        {
          words: ['zettlr', 'azerty'],
          operator: 'OR',
        },
      ],
    };

    const searchResult = searchFileBoolean(descriptor, fileContent, query);
    assert.equal(searchResult.length, 3);
  });

  it('should return correct count excerpt of AND search (two words are present)', function () {
    const query: SearchQueryBoolean = {
      type: 'boolean',
      caseInsensitive: true,
      terms: [
        {
          words: ['zettlr'],
          operator: 'AND',
        },
        {
          words: ['guide'],
          operator: 'AND',
        },
      ],
    };

    const searchResult = searchFileBoolean(descriptor, fileContent, query);
    assert.equal(searchResult.length, 4);
  });

  it('should return correct count excerpt of AND search (only one word is present)', function () {
    const query: SearchQueryBoolean = {
      type: 'boolean',
      caseInsensitive: true,
      terms: [
        {
          words: ['zettlr'],
          operator: 'AND',
        },
        {
          words: ['azerty'],
          operator: 'AND',
        },
      ],
    };

    const searchResult = searchFileBoolean(descriptor, fileContent, query);
    assert.equal(searchResult.length, 0);
  });
});
