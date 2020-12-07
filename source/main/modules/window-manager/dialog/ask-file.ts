/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        askFileDialog
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays an open dialog
 *
 * END HEADER
 */

import { app, BrowserWindow, dialog, FileFilter, OpenDialogOptions, OpenDialogReturnValue } from 'electron'
import path from 'path'
import isDir from '../../../../common/util/is-dir'
import { trans } from '../../../../common/i18n'

/**
 * Displays a dialog to prompt the user for file paths
 *
 * @param   {BrowserWindow|null}  win       The window to attach to
 * @param   {FileFilter[]|null}   filters   Optional filters
 * @param   {boolean}             multiSel  Whether to allow multi selection
 *
 * @return  {Promise<string>[]}             Resolves with an array of paths
 */
export default async function askFileDialog (win: BrowserWindow|null, filters: FileFilter[]|null, multiSel: boolean): Promise<string[]> {
  let startDir = app.getPath('home')

  if (isDir(global.config.get('dialogPaths.askFileDialog'))) {
    startDir = global.config.get('dialogPaths.askFileDialog')
  }

  // Fallback filter: All files
  if (filters === null) {
    filters = [{
      name: trans('system.all_files'),
      extensions: ['*']
    }]
  }

  // Prepare options
  let opt: OpenDialogOptions = {
    title: trans('system.open_file'),
    defaultPath: startDir,
    properties: ['openFile'],
    filters: filters
  }

  // Should multiple selections be allowed?
  if (multiSel) {
    (opt.properties as string[]).push('multiSelections')
  }

  let response: OpenDialogReturnValue
  if (win !== null) {
    response = await dialog.showOpenDialog(win, opt)
  } else {
    response = await dialog.showOpenDialog(opt)
  }

  // Save the path of the containing dir of the first file into the config
  if (!response.canceled && response.filePaths.length > 0) {
    global.config.set('dialogPaths.askFileDialog', path.dirname(response.filePaths[0]))
  }

  // Return an empty array if the dialog was cancelled
  if (response.canceled) {
    return []
  } else {
    return response.filePaths
  }
}
