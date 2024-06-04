/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Counter tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { extractLinefeed } from '../source/app/service-providers/fsal/util/extract-linefeed'
import { strictEqual } from 'assert'

const LF_MAP = {
  '\n': '\\n',
  '\r': '\\r',
  '\r\n': '\\r\\n',
  '\n\r': '\\n\\r'
}

const tests: Array<{ input: string, output: '\r'|'\n'|'\n\r'|'\r\n' }> = [
  {
    input: 'A file without newlines.',
    output: '\n'
  },
  {
    input: 'A file with a simple\nUnix newline.',
    output: '\n'
  },
  {
    input: 'A Windows/MS-DOS file.\r\nIt should contain two linefeeds.\r\n',
    output: '\r\n'
  },
  {
    input: 'A Windows/MS-DOS file with an empty line.\r\n\r\nIt should still work.',
    output: '\r\n'
  },
  {
    input: 'An old Apple II file with just Carriage returns.\rThis should work.',
    output: '\r'
  },
  {
    input: 'Finally, the most obscure: LFCR\n\rAnd another one.\n\r',
    output: '\n\r'
  },
  {
    input: 'Now a test for an empty line.\n\r\n\r',
    output: '\n\r'
  },
  {
    input: 'Lastly, mixed linefeeds.\r\nThis file should default to \r\n, since it\'s the first.\n\rThis is\nstrictly speaking an error.',
    output: '\r\n'
  },
  {
    input: 'This mixed linefeed\rshould fall back to \n.',
    output: '\n'
  }
]

describe('Utility#extractLinefeed()', function () {
  for (const test of tests) {
    it(`should detect ${LF_MAP[test.output]} as the linefeed`, function () {
      strictEqual(extractLinefeed(test.input), test.output)
    })
  }
})
