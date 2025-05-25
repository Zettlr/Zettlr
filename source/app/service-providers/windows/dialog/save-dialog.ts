/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        saveFileDialog
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays an open dialog
 *
 * END HEADER
 */

import {
  app,
  dialog,
  type BrowserWindow,
  type SaveDialogOptions,
  type SaveDialogReturnValue
} from 'electron'
import path from 'path'
import isDir from '@common/util/is-dir'
import { trans } from '@common/i18n-main'
import type LogProvider from '@providers/log'
import type ConfigProvider from '@providers/config'

/**
* Displays a dialog to prompt the user for a file path
*
* @param   {BrowserWindow|null}  win              The window to attach to
* @param   {string}              fileOrPathName   Either an absolute path (in
*                                                 which case the directory will
*                                                 be set as the starting
*                                                 directory) or just a filename,
*                                                 in which case the last known
*                                                 dialogPaths.askFileDialog path
*                                                 will be used.
*
* @return  {Promise<string|undefined>}            Resolves with a path or undefined
*/
export default async function saveFileDialog (logger: LogProvider, config: ConfigProvider, win: BrowserWindow|null, fileOrPathName: string): Promise<string|undefined> {
  let startDir = app.getPath('home')

  if (isDir(config.get('dialogPaths.askFileDialog'))) {
    startDir = config.get('dialogPaths.askFileDialog')
  }

  if (!isDir(path.dirname(fileOrPathName))) {
    // Add a deprecation warning so that we can perspectively remove the config
    // option dialogPaths.askFileDialog and just keep the home directory as kind
    // of a fallback. TODO
    logger.warning(`Warning: saveFileDialog has been called with a relative path: ${fileOrPathName}. This behavior is deprecated. Please always provide an absolute path.`)
  }

  // Prepare options
  let opt: SaveDialogOptions = {
    title: trans('Save file'),
    // If the caller has provided an absolute path to a file, start there. Otherwise,
    // concatenate the startdir
    defaultPath: (isDir(path.dirname(fileOrPathName))) ? fileOrPathName : path.join(startDir, fileOrPathName),
    properties: [ 'createDirectory', 'showOverwriteConfirmation' ]
  }

  let response: SaveDialogReturnValue
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status
  // vs. promise awaits. UPDATE 2024-03-11: In response to #4952, removing the
  // platform check again.
  if (win !== null) {
    response = await dialog.showSaveDialog(win, opt)
  } else {
    response = await dialog.showSaveDialog(opt)
  }

  // Save the path of the containing dir of the first file into the config
  if (!response.canceled && response.filePath !== undefined) {
    config.set('dialogPaths.askFileDialog', path.dirname(response.filePath))
  }

  // Return an empty array if the dialog was cancelled
  if (response.canceled) {
    return undefined
  } else {
    return response.filePath
  }
}
