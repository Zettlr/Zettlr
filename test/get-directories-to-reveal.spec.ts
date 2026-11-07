/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getDirectoriesToReveal tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { deepStrictEqual } from 'assert'
import getDirectoriesToReveal from 'source/common/util/get-directories-to-reveal'

describe('Utility#getDirectoriesToReveal()', function () {
  it('should return all directories from the workspace root to the file', function () {
    deepStrictEqual(
      getDirectoriesToReveal('/home/user/notes/a/b/note.md', [ '/home/user/other', '/home/user/notes' ]),
      [ '/home/user/notes', '/home/user/notes/a', '/home/user/notes/a/b' ]
    )
  })

  it('should return only the root for a file directly in the workspace root', function () {
    deepStrictEqual(getDirectoriesToReveal('/home/user/notes/note.md', ['/home/user/notes']), ['/home/user/notes'])
  })

  it('should use the innermost workspace for nested workspaces', function () {
    deepStrictEqual(
      getDirectoriesToReveal('/home/user/notes/a/b/note.md', [ '/home/user/notes', '/home/user/notes/a' ]),
      [ '/home/user/notes/a', '/home/user/notes/a/b' ]
    )
  })

  it('should not match a workspace that merely shares a name prefix', function () {
    deepStrictEqual(getDirectoriesToReveal('/home/user/notes2/note.md', ['/home/user/notes']), [])
  })

  it('should return an empty array if the file is in no workspace', function () {
    deepStrictEqual(getDirectoriesToReveal('/tmp/note.md', ['/home/user/notes']), [])
    deepStrictEqual(getDirectoriesToReveal('/tmp/note.md', []), [])
  })

  it('should work with Windows paths', function () {
    deepStrictEqual(
      getDirectoriesToReveal('C:\\Users\\me\\notes\\a\\note.md', ['C:\\Users\\me\\notes']),
      [ 'C:\\Users\\me\\notes', 'C:\\Users\\me\\notes\\a' ]
    )
  })
})
