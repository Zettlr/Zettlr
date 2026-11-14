/* eslint-disable no-undef */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TabManager tester
 * CVM-Role:        TESTING
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file tests history navigation of the tab manager.
 *
 * END HEADER
 */

import { TabManager } from '../source/app/service-providers/documents/document-tree/tab-manager'
import assert from 'assert'
import 'mocha'

describe('Modules#TabManager', function () {
  /**
   * Creates a tab manager with the history [/a.md, /b.md] where only /b.md is
   * open. This is the state produced by opening both files while "avoid new
   * tabs" is enabled.
   */
  function prepareHistory (): TabManager {
    const tabMan = new TabManager()
    tabMan.openFile('/a.md')
    tabMan.openFile('/b.md')
    tabMan.closeFile('/a.md')
    return tabMan
  }

  it('opens a new tab when history navigation does not replace the active tab', function () {
    const tabMan = prepareHistory()

    const closedFile = tabMan.back()

    assert.strictEqual(closedFile, null)
    assert.deepStrictEqual(tabMan.openFiles.map(file => file.path), [ '/b.md', '/a.md' ])
    assert.strictEqual(tabMan.activeFile?.path, '/a.md')
  })

  it('replaces the active tab when history navigation is asked to do so', function () {
    const tabMan = prepareHistory()

    const closedFile = tabMan.back(true)

    assert.strictEqual(closedFile?.path, '/b.md')
    assert.deepStrictEqual(tabMan.openFiles.map(file => file.path), [ '/a.md' ])
    assert.strictEqual(tabMan.activeFile?.path, '/a.md')
  })

  it('keeps the active tab if the history target is already open', function () {
    const tabMan = new TabManager()
    tabMan.openFile('/a.md')
    tabMan.openFile('/b.md')

    const closedFile = tabMan.back(true)

    assert.strictEqual(closedFile, null)
    assert.deepStrictEqual(tabMan.openFiles.map(file => file.path), [ '/a.md', '/b.md' ])
    assert.strictEqual(tabMan.activeFile?.path, '/a.md')
  })

  it('does not close a pinned active tab', function () {
    const tabMan = prepareHistory()
    tabMan.setPinnedStatus('/b.md', true)

    const closedFile = tabMan.back(true)

    assert.strictEqual(closedFile, null)
    assert.deepStrictEqual(tabMan.openFiles.map(file => file.path), [ '/b.md', '/a.md' ])
    assert.strictEqual(tabMan.activeFile?.path, '/a.md')
  })

  it('replaces the active tab when navigating forward', function () {
    const tabMan = prepareHistory()
    tabMan.back(true)

    const closedFile = tabMan.forward(true)

    assert.strictEqual(closedFile?.path, '/a.md')
    assert.deepStrictEqual(tabMan.openFiles.map(file => file.path), [ '/b.md' ])
    assert.strictEqual(tabMan.activeFile?.path, '/b.md')
  })
})
