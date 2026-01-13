/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Filename disambiguation tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import assert from 'assert'
import { disambiguateFile } from 'source/app/util/disambiguate-filename'

const testFolder = path.join(__dirname, 'disambiguate-test')
const filePath = path.join(testFolder, 'testfile.txt')
const filePath2 = path.join(testFolder, 'folder')

describe('Utility#disambiguateFile()', function () {
  // Make test dir
  before(async function () {
    await fs.mkdir(testFolder)
  })

  // Run tests: First, bland test.
  it('should return the same path if the file does not yet exist', async function () {
    assert.deepEqual(await disambiguateFile(filePath), filePath)
    // Create the file
    await fs.writeFile(filePath, '')
  })

  let lastNewName = filePath
  const nRuns = 10 // Repeat a few times for good measure
  for (let i = 1; i <= nRuns; i++) {
    it(`${String(i).padStart(2)}. should generate a new filename`, async function () {
      const newName = await disambiguateFile(filePath)
      assert.notDeepEqual(newName, lastNewName)
      // Create that file, too
      await fs.writeFile(newName, '')
      lastNewName = newName
    })
  }

  // Finally, check that we now actually have nRuns + 1 files.
  it(`should correctly count ${nRuns+1} files in the folder`, async function () {
    const files = await fs.readdir(testFolder)
    assert.deepEqual(files.length, nRuns + 1)
  })

  // Edge case: If the proposed filename is a directory, it should still
  // generate a new name.
  it(`should disambiguate a path regardless of whether it's a file or folder`, async function () {
    await fs.mkdir(filePath2)
    const disambiguated = await disambiguateFile(filePath2)
    assert.notDeepEqual(disambiguated, filePath2)
  })

  // Clean test dir
  after(async function () {
    await fs.rm(testFolder, { recursive: true })
  })
})
