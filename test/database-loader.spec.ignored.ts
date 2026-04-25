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

// BUG: Because the biblatex library is an ESModule, we cannot run this test,
// since `ts-node` is incapable of loading the corresponding file.
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
  abstract = {In this collection of essays...[redacted]},
  isbn = {978-0-521-40088-6 978-0-521-40938-4 978-1-139-17383-4},
  file = {[redacted]}
}`,
    type: 'bib',
    expected: {
      path: '', // NOTE: Must be filled in by the test
      type: 'biblatex',
      cslData: {
        'Skocpol1994:SRM': {
          id: 'Skocpol1994:SRM',
          type: ''
        }
      },
      bibtexAttachments: {}
    }
  }
]

describe('CiteprocProvider#LoadDatabase()', async function () {
  let idx = 0

  for (const test of dbTesters) {
    it(`${idx}. should parse the ${test.type} content correctly`, async function () {
      console.log('Hi!')
      const dbPath = path.join(os.tmpdir(), `test-database.${test.type}`)
      await fs.writeFile(dbPath, test.input, 'utf-8')
      console.log('After file')
      console.log('Within test')
      if (test.expected === 'throws') {
        assert.throws(async () => await loadDatabase(dbPath))
      } else {
        const result = await loadDatabase(dbPath)
        assert.deepStrictEqual(result, test.expected)
      }
    })
  }
})
