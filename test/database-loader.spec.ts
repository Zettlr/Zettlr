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

// BUG: The BibLaTeX parser currently exhibits a wrong package.json structure
// that prevents CommonJS projects such as ours from loading it without a bundler.
// Once the biblatex-csl-parser releases a version above 3.5.5, we can actually
// arm this test. I have written this test with a manually overridden
// package.json to make it work, but I don't want to start patching node modules
// in the CI; hence it will remain ignored until the update is out.
// Context: https://github.com/fiduswriter/biblatex-csl-converter/issues/135
import assert from 'assert'
import os from 'os'
import { promises as fs } from 'fs'
import path from 'path'
import type { DatabaseRecord } from '../source/app/service-providers/citeproc'
import { loadDatabase } from '../source/app/service-providers/citeproc/util/database-loader'

interface Test {
  input: string,
  type: 'json'|'yaml'|'bib', // Must correspond to the file types expected
  expected: 'throws'|DatabaseRecord
}

const dbTesters: Test[] = [
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
    type: 'bib',
    expected: {
      path: '', // NOTE: Must be filled in by the test
      type: 'biblatex',
      cslData: {
        'Skocpol1994:SRM': {
          DOI: '10.1017/CBO9781139173834',
          ISBN: '978-0-521-40088-6 978-0-521-40938-4 978-1-139-17383-4',
          URL: 'https://www.cambridge.org/core/product/identifier/9781139173834/type/book',
          abstract: 'In this collection of essays...',
          accessed: { 'date-parts': [[2021, 4, 5]] },
          author: [{ family: 'Skocpol', given: 'Theda' }],
          edition: 1,
          id: 'Skocpol1994:SRM',
          issued: { 'date-parts': [[ 1994, 9, 30]] },
          publisher: 'Cambridge University Press',
          title: 'Social <span class="nocase">Revolutions</span> in the <span class="nocase">Modern World</span>',
          type: 'book'
        }
      },
      bibtexAttachments: { 1: ['[redacted]'] }
    }
  }
]

describe('CiteprocProvider#LoadDatabase()', async function () {
  let idx = 0

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
