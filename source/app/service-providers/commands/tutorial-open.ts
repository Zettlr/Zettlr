/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TutorialOpen command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command copies over the tutorial files and opens them.
 *
 * END HEADER
 */

import path from 'path'
import ZettlrCommand from './zettlr-command'
import { app } from 'electron'
import isDir from '@common/util/is-dir'
import findLangCandidates from '@common/util/find-lang-candidates'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class TutorialOpen extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'tutorial-open')
  }

  /**
   * Sorts a directory according to the argument
   * @param {String} evt The event name
   * @param  {Object} arg An object containing both a hash and a sorting type
   */
  async run (event: string, _arg: any): Promise<any> {
    const tutorialPath = path.join(__dirname, 'tutorial')
    const targetPath = path.join(app.getPath('documents'), 'Zettlr Tutorial')
    const availableLanguages = await this._app.fsal.readdir(tutorialPath)

    const candidates = availableLanguages
      .map(e => { return { tag: e, path: path.join(tutorialPath, e) } })
      .filter(e => isDir(e.path))

    const { exact, close } = findLangCandidates(this._app.config.get().appLang, candidates)

    let tutorial = path.join(tutorialPath, 'en')
    if (exact !== undefined) {
      tutorial = exact.path
    } else if (close !== undefined) {
      tutorial = close.path
    }

    // Now we have both a target and a language candidate, let's copy over the files!
    if (await this._app.fsal.pathExists(targetPath)) {
      this._app.log.info(`[Application] The directory ${targetPath} already exists. Not overwriting any files.`)
    } else {
      await this._app.fsal.createDir(targetPath)
      // Now copy over every file from the directory
      const tutorialFiles = await this._app.fsal.readdir(tutorial)
      for (const file of tutorialFiles) {
        await this._app.fsal.copyFile(path.join(tutorial, file), path.join(targetPath, file))
      }
      this._app.log.info('[Application] Successfully copied the tutorial files', tutorialFiles)
    }

    // Now the last thing to do is set it as open
    await this._app.commands.run('roots-add', [targetPath])
    // Originally, we used `app.workspaces.findDir` to verify that the directory
    // was added, but that was a bug, because when we run `roots-add` above,
    // this will only add the path to the configuration, and the config will
    // then emit an event that the workspaces provider listens to. Long story
    // short, when the next lines of this command are executed, the workspace is
    // not yet loaded, so below's check will always fail.
    if (!this._app.config.get().openPaths.includes(targetPath)) {
      this._app.log.error('[Application] Could not open tutorial files: Directory has not been added to Configuration')
      return
    }

    this._app.config.set('openDirectory', targetPath)
    // We will pre-set the app with a three-pane layout at first. There are two
    // reference files that we will open to the right of the "main" file (welcome.md)

    // We will use the document provider's functions to programmatically create
    // that layout.

    // Make sure there's at least one window
    if (this._app.documents.windowCount() === 0) {
      this._app.documents.newWindow()
    }

    const windowId = this._app.documents.windowKeys()[0]
    // Find the leaf ID
    let leafId: string|undefined
    await this._app.documents.forEachLeaf(async (tabMan, window, leaf) => {
      leafId = leaf
      return false
    })

    if (leafId === undefined) {
      this._app.log.error('[Application] Could not open tutorial: Could not retrieve leafID')
      return
    }

    // What follows basically emulates a user opening the welcome and the split
    // view file, then dragging the split view file to a new split pane, opening
    // the links file, and dragging that down to end up with a three-way split
    // layout.
    const welcomePath = path.join(targetPath, 'welcome.md')
    const linksPath = path.join(targetPath, 'helpful-links.md')
    const splitviewPath = path.join(targetPath, 'split-view-intro.md')

    await this._app.documents.openFile(windowId, leafId, welcomePath, true)
    await this._app.documents.openFile(windowId, leafId, splitviewPath, true)

    // First split: Horizontal to the right
    await this._app.documents.splitLeaf(windowId, leafId, 'horizontal', 'after', splitviewPath)

    // Find the leafId of the newly created leaf
    leafId = undefined
    await this._app.documents.forEachLeaf(async (tabMan, window, leaf) => {
      if (tabMan.activeFile?.path === splitviewPath) {
        leafId = leaf
      }
      return false
    })

    if (leafId === undefined) {
      this._app.log.error('[Application] Could not find new split leaf ID -- aborting opening tutorial files.')
      return
    }

    // Open the links file ...
    await this._app.documents.openFile(windowId, leafId, linksPath, true)
    // ... and directly split it downwards
    await this._app.documents.splitLeaf(windowId, leafId, 'vertical', 'after', linksPath)
  }
}
