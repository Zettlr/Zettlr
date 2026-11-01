/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Database Loader Tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import assert from 'assert'
import os from 'os'
import { promises as fs } from 'fs'
import path from 'path'
import type { DatabaseRecord } from '../source/app/service-providers/citeproc'
import { loadDatabase } from '../source/app/service-providers/citeproc/util/database-loader'

interface Test {
  input: string,
  type: DatabaseRecord["type"], // Must correspond to the file types expected
  expected: 'throws'|DatabaseRecord
}

const dbTesters: Test[] = [
  // Test 1: Bib file
  {
    input: `@book{Skocpol1994:SRM,
  title = {Social {{Revolutions}} in the {{Modern World}}},
  author = {Skocpol, Theda},
  date = {1994-09-30},
  edition = {1},
  publisher = {Cambridge University Press},
  doi = {10.1017/CBO9781139173834},
  url = {https://www.cambridge.org/core/product/identifier/9781139173834/type/book},
  urldate = {2021-04-05},
  abstract = {In this collection of essays...},
  isbn = {978-0-521-40088-6 978-0-521-40938-4 978-1-139-17383-4},
  file = {[redacted]}
}`,
    type: 'biblatex',
    expected: {
      path: '', // NOTE: Must be filled in by the test
      type: 'biblatex',
      cslData: {
        'Skocpol1994:SRM': {
          DOI: '10.1017/CBO9781139173834',
          ISBN: '978-0-521-40088-6 978-0-521-40938-4 978-1-139-17383-4',
          URL: 'https://www.cambridge.org/core/product/identifier/9781139173834/type/book',
          author: [{ family: 'Skocpol', given: 'Theda' }],
          abstract: 'In this collection of essays...',
          accessed: { 'date-parts': [[ 2021, 4, 5 ]] },
          issued: { 'date-parts': [[ 1994, 9, 30 ]] },
          edition: 1,
          id: 'Skocpol1994:SRM',
          publisher: 'Cambridge University Press',
          title: 'Social <span class="nocase">Revolutions</span> in the <span class="nocase">Modern World</span>',
          type: 'book'
        }
      },
      bibtexAttachments: { 'Skocpol1994:SRM': ['[redacted]'] }
    }
  },
  // Test 2: BibLaTeX file
  {
    input: `@Article{ruesen2023,
  author       = {Rüsen, Jörn},
  date         = {2023-11},
  journaltitle = {Hermeneutische Blätter},
  title        = {Nachdenkliches zum Sinn der Geschichte},
  doi          = {10.51686/hbl.2023.1.1},
  issn         = {1660-5403},
  pages        = {11--17},
  file         = {:ruesen2023 - Nachdenkliches zum Sinn der Geschichte.pdf:PDF},
  publisher    = {Hermeneutische Blatter},
}

@Comment{jabref-meta: databaseType:biblatex;}

@Comment{jabref-meta: fileDirectory:/Users/private/Zettlr Main;}`,
    type: 'biblatex',
    expected: {
      path: '', // NOTE: Must be filled in by the test
      type: 'biblatex',
      cslData: {
        'ruesen2023': {
          id: 'ruesen2023',
          DOI: '10.51686/hbl.2023.1.1',
          ISSN: '1660-5403',
          author: [{ family: 'Rüsen', given: 'Jörn' }],
          issued: { 'date-parts': [[ 2023, 11 ]] },
          page: '11-17',
          'container-title': 'Hermeneutische blätter',
          title: 'Nachdenkliches zum sinn der geschichte',
          type: 'article'
        }
      },
      bibtexAttachments: {
        "ruesen2023": [
          "/Users/private/Zettlr Main/ruesen2023 - Nachdenkliches zum Sinn der Geschichte.pdf"
        ]
      }
    }
  }
]

describe('CiteprocProvider#LoadDatabase()', async function () {
  let idx = 1

  for (const test of dbTesters) {
    it(`${idx}. should parse the ${test.type} content correctly`, async function () {
      // Write the input as a database to disk
      const dbPath = path.join(os.tmpdir(), `test-database.${test.type}`)
      await fs.writeFile(dbPath, test.input, 'utf-8')

      if (test.expected === 'throws') {
        assert.throws(async () => await loadDatabase(dbPath))
      } else {
        // Ensure to provide the path to the expected result
        test.expected.path = dbPath
        const result = await loadDatabase(dbPath)
        assert.deepStrictEqual(result, test.expected)
      }
    })
  }
})
