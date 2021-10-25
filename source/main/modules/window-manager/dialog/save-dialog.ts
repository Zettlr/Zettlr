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

import { app, BrowserWindow, dialog, SaveDialogOptions, SaveDialogReturnValue } from 'electron'
import path from 'path'
import isDir from '../../../../common/util/is-dir'
import { trans } from '../../../../common/i18n-main'

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
export default async function saveFileDialog (win: BrowserWindow|null, fileOrPathName: string): Promise<string|undefined> {
  let startDir = app.getPath('home')

  if (isDir(global.config.get('dialogPaths.askFileDialog'))) {
    startDir = global.config.get('dialogPaths.askFileDialog')
  }

  if (!isDir(path.dirname(fileOrPathName))) {
    // Add a deprecation warning so that we can perspectively remove the config
    // option dialogPaths.askFileDialog and just keep the home directory as kind
    // of a fallback. TODO
    global.log.warning(`Warning: saveFileDialog has been called with a relative path: ${fileOrPathName}. This behavior is deprecated. Please always provide an absolute path.`)
  }

  // Prepare options
  let opt: SaveDialogOptions = {
    title: trans('system.save_file'),
    // If the caller has provided an absolute path to a file, start there. Otherwise,
    // concatenate the startdir
    defaultPath: (isDir(path.dirname(fileOrPathName))) ? fileOrPathName : path.join(startDir, fileOrPathName),
    properties: [ 'createDirectory', 'showOverwriteConfirmation' ]
  }

  let response: SaveDialogReturnValue
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status vs. promise awaits.
  if (win !== null && [ 'darwin', 'win32' ].includes(process.platform)) {
    response = await dialog.showSaveDialog(win, opt)
  } else {
    response = await dialog.showSaveDialog(opt)
  }

  // Save the path of the containing dir of the first file into the config
  if (!response.canceled && response.filePath !== undefined) {
    global.config.set('dialogPaths.askFileDialog', path.dirname(response.filePath))
  }

  // Return an empty array if the dialog was cancelled
  if (response.canceled) {
    return undefined
  } else {
    return response.filePath
  }
}
