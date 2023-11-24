/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        mergeEventsIntoTree test
 * CVM-Role:        Unit Test
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This test ensures the mergeEventsIntoTree returns properly
 *                  updated trees.
 *
 * END HEADER
 */

import assert from 'assert'
import { mergeEventsIntoTree } from '@providers/workspaces/merge-events-into-tree'
import type { DirDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import type { ChangeDescriptor } from '@providers/workspaces/root'
import _ from 'lodash'
import { getSorter } from '@providers/fsal/util/directory-sorter'

const infile: MDFileDescriptor = {
  path: '/path/file.md',
  dir: '/path',
  name: 'file.md',
  root: true,
  type: 'file',
  size: 0,
  modtime: 10,
  creationtime: 10,
  ext: '.md',
  id: '',
  tags: [],
  links: [],
  bom: '',
  wordCount: 0,
  charCount: 0,
  firstHeading: null,
  yamlTitle: undefined,
  frontmatter: null,
  linefeed: '\n',
  modified: false
}

const outfile: MDFileDescriptor = {
  path: '/path/file.md',
  dir: '/path',
  name: 'file.md',
  root: true,
  type: 'file',
  size: 0,
  modtime: 1000, // This has changed
  creationtime: 10,
  ext: '.md',
  id: '',
  tags: [ 'one', 'two' ], // This has changed
  links: [],
  bom: '',
  wordCount: 4, // This has changed
  charCount: 17, // This has changed
  firstHeading: 'Some heading', // This has changed
  yamlTitle: undefined,
  frontmatter: null,
  linefeed: '\n',
  modified: false
}

const indir: DirDescriptor = {
  path: '/path',
  dir: '/',
  name: 'path',
  root: true,
  type: 'directory',
  size: 0,
  modtime: 10,
  creationtime: 10,
  settings: {
    sorting: 'name-down',
    icon: null,
    project: null
  },
  isGitRepository: false,
  children: [infile] // NOTE: The infile is part of this directory
}

const outdirDescriptor: DirDescriptor = {
  path: '/path',
  dir: '/',
  name: 'path',
  root: true,
  type: 'directory',
  size: 20, // This has changed
  modtime: 15, // This has changed
  creationtime: 10,
  settings: {
    sorting: 'name-up', // This has changed
    icon: null,
    project: null
  },
  isGitRepository: false,
  children: [] // NOTE: We are passing in an empty children array as returned by shallow parse
}

const outdir: DirDescriptor = {
  path: '/path',
  dir: '/',
  name: 'path',
  root: true,
  type: 'directory',
  size: 20, // This has changed
  modtime: 15, // This has changed
  creationtime: 10,
  settings: {
    sorting: 'name-up', // This has changed
    icon: null,
    project: null
  },
  isGitRepository: false,
  children: [infile] // NOTE: Here we add the infile so that the test succeeds
}

const outdirTwo = _.cloneDeep(outdir)
outdirTwo.children = [outfile]

// /////////////////////////////////////////////////////////////////////////////

const tests = [
  {
    it: 'properly updates a root file',
    changes: [{ path: infile.path, type: 'change', descriptor: _.cloneDeep(outfile) }] as ChangeDescriptor[],
    input: _.cloneDeep(infile),
    output: _.cloneDeep(outfile)
  },
  {
    it: 'properly updates a root directory',
    changes: [{ path: indir.path, type: 'change', descriptor: _.cloneDeep(outdirDescriptor) }] as ChangeDescriptor[],
    input: _.cloneDeep(indir),
    output: _.cloneDeep(outdir)
  },
  {
    it: 'properly adds a new file to a directory',
    changes: [{ path: infile.path, type: 'add', descriptor: _.cloneDeep(infile) }] as ChangeDescriptor[],
    input: _.cloneDeep(outdirDescriptor), // Mimick the missing/added file by using these two
    output: _.cloneDeep(outdir)
  },
  {
    it: 'properly deletes a file from a directory',
    changes: [{ path: infile.path, type: 'unlink' }] as ChangeDescriptor[],
    input: _.cloneDeep(outdir), // Mimick the added/unlinked file by using these two
    output: _.cloneDeep(outdirDescriptor)
  },
  {
    it: 'properly changes a file within a directory',
    changes: [{ path: infile.path, type: 'change', descriptor: _.cloneDeep(outfile) }] as ChangeDescriptor[],
    input: _.cloneDeep(outdir), // Start from the modified directory ...
    output: _.cloneDeep(outdirTwo) // ... and only change infile to outfile
  },
  {
    it: 'properly applies multiple consecutive changes',
    changes: [
      // First, remove the file from the indir
      { path: infile.path, type: 'unlink' },
      // Then, change the directory
      { path: indir.path, type: 'change', descriptor: _.cloneDeep(outdirDescriptor) },
      // Then, re-add the file
      { path: infile.path, type: 'add', descriptor: _.cloneDeep(infile) },
      // Finally, change the file
      { path: infile.path, type: 'change', descriptor: _.cloneDeep(outfile) }
    ] as ChangeDescriptor[],
    input: _.cloneDeep(indir),
    output: _.cloneDeep(outdirTwo) // Add the end, we should arrive at outdirTwo
  }
]

describe('mergeEventsIntoTree()', function () {
  const sorter = getSorter('ascii', true, 'filename', 'en-US', 'modtime')
  for (const test of tests) {
    it(test.it, function () {
      assert.deepStrictEqual(mergeEventsIntoTree(test.changes, test.input, sorter), test.output)
    })
  }
})
