/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        askDirectory
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays an open dialog
 *
 * END HEADER
 */

import { app, BrowserWindow, dialog, OpenDialogOptions, OpenDialogReturnValue } from 'electron'
import isDir from '../../../../common/util/is-dir'
import { trans } from '../../../../common/i18n'

/**
 * Asks the user for directory path(s)
 *
 * @param   {BrowserWindow|null}  win  The window to attach to
 *
 * @return  {Promise<string>[]}        Resolves with an array of paths
 */
export default async function askDirectory (win: BrowserWindow|null): Promise<string[]> {
  let startDir = app.getPath('home')

  if (isDir(global.config.get('dialogPaths.askDirDialog'))) {
    startDir = global.config.get('dialogPaths.askDirDialog')
  }

  const options: OpenDialogOptions = {
    title: trans('system.open_folder'),
    defaultPath: startDir,
    properties: [
      'openDirectory',
      'createDirectory' // macOS only
    ]
  }

  let response: OpenDialogReturnValue
  if (win !== null) {
    response = await dialog.showOpenDialog(win, options)
  } else {
    response = await dialog.showOpenDialog(options)
  }

  // Save the path of the dir into the config
  if (!response.canceled && response.filePaths.length > 0) {
    global.config.set('dialogPaths.askDirDialog', response.filePaths[0])
  }

  if (response.canceled) {
    return []
  } else {
    return response.filePaths
  }
}
