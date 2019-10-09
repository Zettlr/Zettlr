/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        utility.js
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the entry point for testing the Zettlr
 *                  utility functions.
 *
 * END HEADER
 */

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                                           *
 *                     INCLUDE THE UTILITY COMMANDS                          *
 *                                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const countWords = require('../source/common/util/count-words')
const findObject = require('../source/common/util/find-object')
// const flattenDirectoryTree = require('../source/common/util/flatten-directory-tree')
// const formatDate = require('../source/common/util/format-date')
// const generateFilename = require('../source/common/util/generate-filename')
// const generateId = require('../source/common/util/generate-id')
// const generateMarkdownTable = require('../source/common/util/generate-markdown-table')
// const hash = require('../source/common/util/hash')
// const ignoreDir = require('../source/common/util/ignore-dir')
// const ignoreFile = require('../source/common/util/ignore-file')
// const isAttachment = require('../source/common/util/is-attachment')
// const isDictAvailable = require('../source/common/util/is-dict-available')
// const isDir = require('../source/common/util/is-dir')
// const isFile = require('../source/common/util/is-file')
// const isFunction = require('../source/common/util/is-function')
// const localiseNumber = require('../source/common/util/localise-number')
// const makeImgPathsAbsolute = require('../source/common/util/make-img-paths-absolute')
const makeSearchRegex = require('../source/common/util/make-search-regex')
// const objectToArray = require('../source/common/util/object-to-array')
// const replaceStringVariables = require('../source/common/util/replace-string-variables')
// const sortAscii = require('../source/common/util/sort-ascii')
// const sortDate = require('../source/common/util/sort-date')
// const sort = require('../source/common/util/sort')

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                                           *
 *                        INCLUDE ASSERTION LIB                              *
 *                                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const assert = require('assert')

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                                           *
 *                           DEFINE TEST INPUTS                              *
 *                                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const makeSearchRegexTesters = [
  { 'input': 'hello', 'expected': /hello/i },
  { 'input': '/\\w/g', 'expected': /\w/g },
  { 'input': '/\\w/abide', 'expected': /\/\\w\/abide/i }, // Wrong flags, should be treated as a normal search
  { 'input': '/[a-zA-Z0-9]/', 'expected': /[a-zA-Z0-9]/ },
  { 'input': '/<a href="(.+?)">(.+?)<\\/a>/', 'expected': /<a href="(.+?)">(.+?)<\/a>/ }
]

const countWordsTesters = [
  { 'input': 'Lorem\n\n# Ipsum', 'expected': 2 },
  { 'input': 'Lorem\n\n# Ipsum Dolor', 'expected': 3 },
  { 'input': '\n\n', 'expected': 0 },
  { 'input': '* one\n* two\n* three', 'expected': 3 },
  { 'input': '#', 'expected': 0 }
]

const findObjectTree = {
  'attachments': [
    { 'hash': -1512390270, 'name': 'af3e9f483cefb0f863ddbfbc5c622178.png', 'path': '/Users/hendrik/Documents/My Texts/af3e9f483cefb0f863ddbfbc5c622178.png' },
    { 'hash': -1117915784, 'name': 'My Texts.pdf', 'path': '/Users/hendrik/Documents/My Texts/My Texts.pdf' }
  ],
  'children': [
    { 'hash': 1955074503, 'name': '05 Fifth.md', 'path': '/Users/hendrik/Documents/My Texts/05 Fifth.md' },
    { 'hash': -1886465791, 'name': '00 Very first.md', 'path': '/Users/hendrik/Documents/My Texts/00 Very first.md' },
    { 'hash': 1712390491, 'name': 'Another name.md', 'path': '/Users/hendrik/Documents/My Texts/Another name.md' }
  ],
  'hash': -570710067,
  'name': 'My Texts',
  'path': '/Users/hendrik/Documents/My Texts'
}

const findObjectTester = [
  // Function Signature: tree, prop, val, traverse
  { 'input': [ findObjectTree, 'hash', -570710067, 'children' ], 'expected': findObjectTree },
  { 'input': [ findObjectTree, 'hash', 1712390491, 'children' ], 'expected': findObjectTree.children[2] },
  // Should return undefined, as it's an attachment and therefore not in the children
  { 'input': [ findObjectTree, 'path', '/Users/hendrik/Documents/My Texts/My Texts.pdf', 'children' ], 'expected': undefined },
  // This should work as the traversal occurs on attachments property
  { 'input': [ findObjectTree, 'hash', -1512390270, 'attachments' ], 'expected': findObjectTree.attachments[0] }
]

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                                                                           *
 *                                RUN THE TESTS                              *
 *                                                                           *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
describe('Utility', function () {
  describe('#countWords()', function () {
    for (let test of countWordsTesters) {
      it(`should return ${test.expected} words`, function () {
        assert.strictEqual(countWords(test.input), test.expected)
      })
    }
  })

  describe('#findObject()', function () {
    for (let test of findObjectTester) {
      let expression = (test.expected === undefined) ? 'undefined' : 'the correct object'
      it(`should return ${expression}`, function () {
        // We can make use of the ES6 spread operator here
        assert.strictEqual(findObject(...test.input), test.expected)
      })
    }
  })

  describe('#makeSearchRegex()', function () {
    for (let test of makeSearchRegexTesters) {
      // For each tested unit, expect the string representations of both
      // the correct and the input regular expression to be equal.
      it(`should return the regular expression ${String(test.expected)}`, function () {
        assert.strictEqual(String(makeSearchRegex(test.input)), String(test.expected))
      })
    }
  })
})
