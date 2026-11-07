/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ForceOpen command tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests a component of Zettlr.
 *
 * END HEADER
 */

import { deepStrictEqual } from 'assert'
import path from 'path'
import ForceOpen from 'source/app/service-providers/commands/force-open'
import type { AppServiceContainer } from 'source/app/app-service-container'
import type { NewLinkedFileLocation } from 'source/common/util/get-new-linked-file-directory'

const ws = path.join('/', 'tmp', 'zettlr-tmp')
const customDirectory = path.join(ws, 'new-notes')
const sourceFile = path.join(ws, 'subfolder', 'note.md')

/**
 * Builds a minimal fake app container and returns it alongside a log of all
 * commands that ForceOpen ran.
 */
function makeApp (newFileLocation: NewLinkedFileLocation, existingDirs: string[]): { app: AppServiceContainer, commands: any[] } {
  const commands: any[] = []
  const app = {
    config: {
      get: () => ({
        zkn: { newFileLocation, customDirectory },
        app: { openWorkspaces: [ path.join('/', 'home', 'user', 'Tutorial'), ws ] }
      })
    },
    fsal: {
      findExact: async () => undefined,
      isDir: async (p: string) => existingDirs.includes(p)
    },
    documents: {
      windowKeys: () => ['window-1'],
      getLastFocusedLeafId: () => 'leaf-1',
      getActiveFile: (leafId: string) => leafId === 'leaf-1' ? sourceFile : null,
      openFile: async () => true
    },
    commands: {
      run: async (cmd: string, payload: any) => {
        commands.push({ cmd, path: payload.path })
        return path.join(payload.path, `${String(payload.name)}.md`)
      }
    }
  }
  return { app: app as unknown as AppServiceContainer, commands }
}

const allDirs = [ ws, customDirectory, path.dirname(sourceFile) ]

const tests: Array<{ location: NewLinkedFileLocation, dirs: string[], expected: string|undefined }> = [
  { location: 'default', dirs: allDirs, expected: undefined },
  { location: 'customFolder', dirs: [ ws, path.dirname(sourceFile) ], expected: undefined },
  { location: 'workspaceRoot', dirs: allDirs, expected: ws },
  { location: 'currentFolder', dirs: allDirs, expected: path.dirname(sourceFile) },
  { location: 'customFolder', dirs: allDirs, expected: customDirectory }
]

describe('Command#ForceOpen', function () {
  for (const test of tests) {
    it(`should create the file in ${String(test.expected)} for "${test.location}"`, async function () {
      const { app, commands } = makeApp(test.location, test.dirs)
      const result = await new ForceOpen(app).run('force-open', { linkContents: 'New Note', leafId: 'leaf-1' })
      deepStrictEqual(commands, test.expected === undefined ? [] : [{ cmd: 'file-new', path: test.expected }])
      deepStrictEqual(result, test.expected === undefined
        ? { action: 'none' }
        : { action: 'created', filePath: path.join(test.expected, 'New Note.md') })
    })
  }

  it('should report "opened" and create nothing if the file exists', async function () {
    const { app, commands } = makeApp('customFolder', allDirs)
    ;(app.fsal as any).findExact = async () => ({ path: path.join(ws, 'Existing.md') })
    const result = await new ForceOpen(app).run('force-open', { linkContents: 'Existing', leafId: 'leaf-1' })
    deepStrictEqual(commands, [])
    deepStrictEqual(result, { action: 'opened', filePath: path.join(ws, 'Existing.md') })
  })

  it('should report "none" if file-new did not create a file', async function () {
    const { app } = makeApp('customFolder', allDirs)
    ;(app.commands as any).run = async () => undefined
    const result = await new ForceOpen(app).run('force-open', { linkContents: 'New Note', leafId: 'leaf-1' })
    deepStrictEqual(result, { action: 'none' })
  })
})
