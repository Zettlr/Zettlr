/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        makeValidUri tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const makeValidUri = require('../source/common/util/make-valid-uri')
const assert = require('assert')

const base = '/home/foo/documents'

const makeUriTesters = [
  // Full URIs should be returned as they are
  { 'input': 'file:///home/foo/documents/test.md', 'expected': 'file:///home/foo/documents/test.md' },
  { 'input': 'http://www.example.com/', 'expected': 'http://www.example.com/' },
  { 'input': 'ftp://api.somelink.fm/api/test.php', 'expected': 'ftp://api.somelink.fm/api/test.php' },
  { 'input': '//shared-host/docs/file.md', 'expected': 'file:////shared-host/docs/file.md' },
  // Relative files with file protocol should be converted to absolute
  { 'input': 'file://./relative/file.md', 'expected': 'file:///home/foo/documents/relative/file.md' },
  // Links without protocol should receive the HTTPS protocol
  { 'input': 'github.com', 'expected': 'https://github.com' },
  { 'input': 'www.zettlr.com', 'expected': 'https://www.zettlr.com' },
  // Absolute file paths should be returned with the file protocol
  { 'input': '/home/bar/documents/absolute.md', 'expected': 'file:///home/bar/documents/absolute.md' },
  // Relative paths both with and without the leading full stop indicator should be converted absolute
  { 'input': './more/relative.md', 'expected': 'file:///home/foo/documents/more/relative.md' },
  { 'input': 'another/relative.md', 'expected': 'file:///home/foo/documents/another/relative.md' },
  // As this is a .md-file, the heuristic should treat it as a file
  { 'input': 'folder.bundle/file.md', 'expected': 'file:///home/foo/documents/folder.bundle/file.md' },
  // This is a moldovan TLD URI. The trailing slash indicates this is not a markdown file.
  { 'input': 'gov.md/', 'expected': 'https://gov.md/' },
  // Alleviation: Simply make it explicitly relative, either by adding the protocol or with a full stop
  { 'input': 'file://folder.bundle/file.md', 'expected': 'file:///home/foo/documents/folder.bundle/file.md' },
  { 'input': './folder.bundle/file.md', 'expected': 'file:///home/foo/documents/folder.bundle/file.md' }
]

describe('Utility#makeValidUri()', function () {
  for (let test of makeUriTesters) {
    it(`Input "${test.input}" should return ${test.expected}`, function () {
      assert.strictEqual(makeValidUri(test.input, base), test.expected)
    })
  }
})
