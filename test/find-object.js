/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        findObject tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

const findObject = require('../source/common/util/find-object')
const assert = require('assert')

const findObjectTree = {
  'attachments': [
    {
      'hash': -1512390270,
      'name': 'af3e9f483cefb0f863ddbfbc5c622178.png',
      'path': '/Users/hendrik/Documents/My Texts/af3e9f483cefb0f863ddbfbc5c622178.png'
    },
    {
      'hash': -1117915784,
      'name': 'My Texts.pdf',
      'path': '/Users/hendrik/Documents/My Texts/My Texts.pdf'
    }
  ],
  'children': [
    {
      'hash': 1955074503,
      'name': '05 Fifth.md',
      'path': '/Users/hendrik/Documents/My Texts/05 Fifth.md'
    },
    {
      'hash': -1886465791,
      'name': '00 Very first.md',
      'path': '/Users/hendrik/Documents/My Texts/00 Very first.md'
    },
    {
      'hash': 1712390491,
      'name': 'Another name.md',
      'path': '/Users/hendrik/Documents/My Texts/Another name.md'
    }
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

describe('Utility#findObject()', function () {
  for (let test of findObjectTester) {
    let expression = (test.expected === undefined) ? 'undefined' : 'the correct object'
    it(`should return ${expression}`, function () {
      // We can make use of the ES6 spread operator here
      assert.strictEqual(findObject(...test.input), test.expected)
    })
  }
})
