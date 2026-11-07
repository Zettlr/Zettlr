/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getNewLinkedFileDirectory tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { strictEqual } from 'assert'
import path from 'path'
import getNewLinkedFileDirectory, { getWorkspaceRootForFile, type NewLinkedFileLocation } from 'source/common/util/get-new-linked-file-directory'

const source = path.join('/', 'home', 'user', 'notes', 'sub', 'note.md')
const custom = path.join('/', 'home', 'user', 'zettelkasten')
const wsNotes = path.join('/', 'home', 'user', 'notes')
const wsOther = path.join('/', 'home', 'user', 'other')
const wsSimilar = path.join('/', 'home', 'user', 'notes2')

const tests: Array<{ location: NewLinkedFileLocation, custom: string, source: string|null, expected: string|undefined, ws?: string[] }> = [
  // Default: never create a file, even if a custom directory is set
  { location: 'default', custom: '', source, expected: undefined },
  { location: 'default', custom, source, expected: undefined },
  { location: 'default', custom, source, ws: [wsNotes], expected: undefined },
  // Workspace root
  { location: 'workspaceRoot', custom, source, ws: [ wsOther, wsNotes ], expected: wsNotes },
  { location: 'workspaceRoot', custom, source, ws: [wsOther], expected: undefined },
  { location: 'workspaceRoot', custom, source, ws: [], expected: undefined },
  { location: 'workspaceRoot', custom, source: null, ws: [wsNotes], expected: undefined },
  // Current folder
  { location: 'currentFolder', custom, source, expected: path.dirname(source) },
  { location: 'currentFolder', custom: '', source, expected: path.dirname(source) },
  { location: 'currentFolder', custom, source: null, expected: undefined },
  { location: 'currentFolder', custom, source: '', expected: undefined },
  // Custom folder
  { location: 'customFolder', custom, source, expected: custom },
  { location: 'customFolder', custom: '', source, expected: undefined }
]

describe('Utility#getNewLinkedFileDirectory()', function () {
  for (const test of tests) {
    it(`should return ${String(test.expected)} for location "${test.location}", custom "${test.custom}", source ${String(test.source)}`, function () {
      strictEqual(getNewLinkedFileDirectory(test.location, test.custom, test.source, test.ws), test.expected)
    })
  }
})

describe('Utility#getWorkspaceRootForFile()', function () {
  const file = path.join(wsNotes, 'sub', 'note.md')

  it('should find the workspace containing the file among several', function () {
    strictEqual(getWorkspaceRootForFile(file, [ wsOther, wsNotes ]), wsNotes)
  })

  it('should not match a workspace that merely shares a name prefix', function () {
    strictEqual(getWorkspaceRootForFile(path.join(wsSimilar, 'note.md'), [wsNotes]), undefined)
    strictEqual(getWorkspaceRootForFile(path.join(wsSimilar, 'note.md'), [ wsNotes, wsSimilar ]), wsSimilar)
  })

  it('should return the innermost workspace for nested workspaces', function () {
    const nested = path.join(wsNotes, 'sub')
    strictEqual(getWorkspaceRootForFile(file, [ wsNotes, nested ]), nested)
    strictEqual(getWorkspaceRootForFile(file, [ nested, wsNotes ]), nested)
  })

  it('should return undefined if the file is in no workspace', function () {
    strictEqual(getWorkspaceRootForFile(file, [wsOther]), undefined)
    strictEqual(getWorkspaceRootForFile(file, []), undefined)
  })

  it('should not treat the workspace root itself as a file inside it', function () {
    strictEqual(getWorkspaceRootForFile(wsNotes, [wsNotes]), undefined)
  })
})
