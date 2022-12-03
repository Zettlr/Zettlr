/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RootOpen command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command handles opening root files or workspaces.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-main'
import ignoreDir from '@common/util/ignore-dir'
import ignoreFile from '@common/util/ignore-file'
import isDir from '@common/util/is-dir'
import isFile from '@common/util/is-file'
import { app } from 'electron'
import path from 'path'
import ZettlrCommand from './zettlr-command'

export default class RootOpen extends ZettlrCommand {
  constructor (app: any) {
    super(app, [ 'root-open-files', 'root-open-workspaces', 'roots-add' ])
  }

  /**
   * Opens new roots. If called using 'roots-add' it will only open the provided
   * roots. If called using either 'root-open-files' or 'root-open-workspaces'
   * it will ask the user to select paths.
   *
   * @param  {string}   evt    The event name
   * @param  {string[]} roots  Optionally a list of roots to also add
   *
   * @return {Promise<boolean>} Resolves with a boolean
   */
  async run (evt: string, roots: string[] = []): Promise<boolean> {
    // The caller can run this command using 'roots-add' to simply add a few
    // roots to the application without prompting the user
    if (evt === 'root-open-files') {
      roots.push(...await this.openFiles())
    } else if (evt === 'root-open-workspaces') {
      roots.push(...await this.openWorkspaces())
    }

    await this.handleAddRoots(roots)
    return true
  }

  /**
   * Asks the user to provide paths to files which should be opened
   *
   * @return  {<Promise><string>[]}  The selected paths
   */
  private async openFiles (): Promise<string[]> {
    // The user wants to open another file or directory.
    const extensions = [ 'markdown', 'md', 'txt', 'rmd' ]
    const filter = [{ name: trans('Files'), extensions }]

    return await this._app.windows.askFile(filter, true)
  }

  /**
   * Asks the user to provide paths to workspaces which should be opened
   *
   * @return  {Promise<string>[]}  The selected paths
   */
  private async openWorkspaces (): Promise<string[]> {
    // TODO: Move this to a command
    // The user wants to open another file or directory.
    const ret = await this._app.windows.askDir(trans('Open project folder'), null)

    for (const workspace of ret) {
      const ignoredDir = isDir(workspace) && ignoreDir(workspace)
      const ignoredFile = isFile(workspace) && ignoreFile(workspace)
      if (ignoredDir || ignoredFile || workspace === app.getPath('home')) {
        // We cannot add this dir, because it is in the list of ignored directories.
        this._app.log.error(`The chosen workspace "${workspace}" is on the ignore list.`)
        this._app.windows.prompt({
          'type': 'error',
          'title': trans('Cannot open directory'),
          'message': trans('Directory &quot;%s&quot; cannot be opened by Zettlr.', path.basename(workspace))
        })
      }
    }

    return ret
  }

  /**
   * Handles a list of files and folders that the user in any way wants to add
   * to the app.
   *
   * @param  {string[]} pathlist An array of absolute paths
   */
  private async handleAddRoots (pathlist: string[]): Promise<void> {
    // As long as it's not a forbidden file or ignored directory, add it.
    if (pathlist.length === 0) {
      return // No need to add anything
    }

    let newFile = null
    let newDir = null

    // Make sure there's at least one window
    if (this._app.documents.windowCount() === 0) {
      this._app.documents.newWindow()
    }

    // Always open these files in the focused main window OR the first one
    const firstWin = this._app.windows.getFirstMainWindow()
    const winKey = firstWin !== undefined
      ? this._app.windows.getMainWindowKey(firstWin) ?? this._app.documents.windowKeys()[0]
      : this._app.documents.windowKeys()[0]

    const leafId = this._app.documents.leafIds(winKey)[0]

    for (const absPath of pathlist) {
      // First check if this thing is already added. If so, simply write
      // the existing file/dir into the newFile/newDir vars. They will be
      // opened accordingly.
      if ((newFile = this._app.fsal.findFile(absPath)) !== undefined) {
        // Open the file immediately
        await this._app.documents.openFile(winKey, leafId, newFile.path, true)
        // Also set the newDir variable so that Zettlr will automatically
        // navigate to the directory. The directory of the latest file will
        // remain open afterwards.
        newDir = this._app.fsal.findDir(newFile.dir)
      } else if ((newDir = this._app.fsal.findDir(absPath)) != null) {
        // Do nothing
      } else if (this._app.config.addPath(absPath)) {
        try {
          if (isDir(absPath)) {
            this._app.notifications.show(trans('Opening new root %s …', path.basename(absPath)))
          }
          const loaded = await this._app.fsal.loadPath(absPath)
          if (loaded) {
            // If it was a file and not a directory, immediately open it.
            const file = this._app.fsal.findFile(absPath)
            if (file !== undefined) {
              await this._app.documents.openFile(winKey, leafId, file.path, true)
            }

            if (isDir(absPath)) {
              this._app.notifications.show(trans('%s has been loaded.', path.basename(absPath)))
            }
          } else {
            this._app.config.removePath(absPath)
          }
        } catch (err: any) {
          // Something went wrong, so remove the path again.
          this._app.config.removePath(absPath)
          this._app.log.error(`Could not open root ${absPath}: ${err.message as string}`, err)
          this._app.windows.reportFSError('Could not open new root', err)
        }
      } else {
        this._app.notifications.show(trans('Could not open workspace %s.', path.basename(absPath)))
        this._app.log.error(`Could not open new root ${absPath}!`)
      }
    }

    // Open the newly added path(s) directly.
    if (newDir !== undefined) {
      this._app.fsal.openDirectory = newDir
    }
  }
}
