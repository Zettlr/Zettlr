/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File extension check tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import {
  hasAnyRecognizedFileExtension,
  hasCodeExt,
  hasExt,
  hasImageExt,
  hasMarkdownExt,
  hasPDFExt
} from '@common/util/file-extention-checks'
import assert from 'assert'

describe('Utility#hasExt()', function () {
  it('should match a lowercase extension', function () {
    assert.strictEqual(hasExt('/home/foo/note.md', [ '.md' ]), true)
  })

  it('should match regardless of the case of the path', function () {
    assert.strictEqual(hasExt('/home/foo/NOTE.MD', [ '.md' ]), true)
    assert.strictEqual(hasExt('/home/foo/Note.Md', [ '.md' ]), true)
  })

  it('should match regardless of the case of the extension list', function () {
    // attachmentExtensions comes from the user config, so it can hold anything
    assert.strictEqual(hasExt('/home/foo/photo.jpg', [ '.JPG' ]), true)
    assert.strictEqual(hasExt('/home/foo/PHOTO.JPG', [ '.JPG' ]), true)
  })

  it('should not match a different extension', function () {
    assert.strictEqual(hasExt('/home/foo/note.md', [ '.tex' ]), false)
    assert.strictEqual(hasExt('/home/foo/note.mdx', [ '.md' ]), false)
  })

  it('should not match a name that merely ends in the same letters', function () {
    assert.strictEqual(hasExt('/home/foo/readme', [ '.md' ]), false)
  })

  it('should return false for an empty extension list', function () {
    assert.strictEqual(hasExt('/home/foo/note.md', []), false)
  })
})

const uppercaseTesters = [
  { 'fn': hasMarkdownExt, 'name': 'hasMarkdownExt', 'path': '/home/foo/README.MD' },
  { 'fn': hasMarkdownExt, 'name': 'hasMarkdownExt', 'path': '/home/foo/Paper.Markdown' },
  { 'fn': hasCodeExt, 'name': 'hasCodeExt', 'path': '/home/foo/Thesis.TEX' },
  { 'fn': hasImageExt, 'name': 'hasImageExt', 'path': '/home/foo/IMG_1234.JPG' },
  { 'fn': hasImageExt, 'name': 'hasImageExt', 'path': '/home/foo/Diagram.PNG' },
  { 'fn': hasPDFExt, 'name': 'hasPDFExt', 'path': '/home/foo/Scan.PDF' }
]

describe('Utility#fileExtensionChecks()', function () {
  for (const test of uppercaseTesters) {
    it(`${test.name}() should recognise ${test.path}`, function () {
      assert.strictEqual(test.fn(test.path), true)
    })
  }

  it('should recognise an uppercase custom attachment extension', function () {
    assert.strictEqual(
      hasAnyRecognizedFileExtension('/home/foo/archive.ZIP', [ '.zip' ]),
      true
    )
  })

  it('should still reject an unrecognised extension', function () {
    assert.strictEqual(hasAnyRecognizedFileExtension('/home/foo/binary.EXE'), false)
  })
})
