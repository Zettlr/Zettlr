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

import { app, BrowserWindow, dialog, FileFilter, SaveDialogOptions, SaveDialogReturnValue } from 'electron'
import path from 'path'
import isDir from '../../../../common/util/is-dir'
import { trans } from '../../../../common/i18n'

/**
* Displays a dialog to prompt the user for a file path
*
* @param   {BrowserWindow|null}  win       The window to attach to
* @param   {FileFilter[]|null}   filters   Optional filters
*
* @return  {Promise<string|undefined>}     Resolves with a path or undefined
*/
export default async function saveFileDialog (win: BrowserWindow|null, filename: string): Promise<string|undefined> {
  let startDir = app.getPath('home')

  if (isDir(global.config.get('dialogPaths.askFileDialog'))) {
    startDir = global.config.get('dialogPaths.askFileDialog')
  }

  // Prepare options
  let opt: SaveDialogOptions = {
    title: trans('system.save_file'),
    defaultPath: path.join(startDir, filename),
    properties: [ 'createDirectory', 'showOverwriteConfirmation' ]
  }

  let response: SaveDialogReturnValue
  if (win !== null) {
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
