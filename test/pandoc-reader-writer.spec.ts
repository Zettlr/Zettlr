/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        pandocReaderWriter tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { parseReaderWriter, readerWriterToString, PandocReaderWriter } from 'source/common/pandoc-util/parse-reader-writer'
import assert from 'assert'

const parseTests: Array<{ input: string, expected: PandocReaderWriter }> = [
  { input: 'markdown-smart', expected: { name: 'markdown', isCustom: false, enabledExtensions: [], disabledExtensions: ['smart'] } },
  { input: 'markdown-smart+pipe_tables', expected: { name: 'markdown', isCustom: false, enabledExtensions: ['pipe_tables'], disabledExtensions: ['smart'] } },
  { input: 'markdown-pipe_tables-smart', expected: { name: 'markdown', isCustom: false, enabledExtensions: [], disabledExtensions: ['pipe_tables', 'smart'] } },
  { input: 'custom.lua', expected: { name: 'custom.lua', isCustom: true, enabledExtensions: [], disabledExtensions: [] } },
  { input: 'custom.lua+smart-pipe_tables', expected: { name: 'custom.lua', isCustom: true, enabledExtensions: ['smart'], disabledExtensions: ['pipe_tables'] } },
]

const stringifyTests: Array<{ input: PandocReaderWriter, expected: string }> = [
  { input: { name: 'markdown', isCustom: false, enabledExtensions: [], disabledExtensions: ['smart'] }, expected: 'markdown-smart' },
  { input: { name: 'markdown', isCustom: false, enabledExtensions: ['pipe_tables'], disabledExtensions: ['smart'] }, expected: 'markdown+pipe_tables-smart' },
  { input: { name: 'markdown', isCustom: false, enabledExtensions: [], disabledExtensions: ['smart', 'pipe_tables'] }, expected: 'markdown-smart-pipe_tables' },
  { input: { name: 'custom.lua', isCustom: true, enabledExtensions: [], disabledExtensions: [] }, expected: 'custom.lua' },
  { input: { name: 'custom.lua', isCustom: true, enabledExtensions: ['smart'], disabledExtensions: ['pipe_tables'] }, expected: 'custom.lua+smart-pipe_tables' },
]

describe('Pandoc#readerWriter()', function () {
  for (const test of parseTests) {
    it(`Input "${test.input}" should be parsed correctly`, function () {
      assert.deepStrictEqual(parseReaderWriter(test.input), test.expected)
    })
  }

  for (const test of stringifyTests) {
    it(`Input should be stringified correctly to "${test.expected}"`, function () {
      assert.deepStrictEqual(readerWriterToString(test.input), test.expected)
    })
  }
})
