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
import isDir from '@common/util/is-dir'

/**
 * Asks the user for directory path(s)
 *
 * @param   {BrowserWindow|null}  win  The window to attach to
 * @param title {string}               Title of the Window
 * @param buttonLabel {string|null}    Label of the Button
 * @return  {Promise<string>[]}        Resolves with an array of paths
 */
export default async function askDirectory (config: ConfigProvider, win: BrowserWindow|null, title: string, buttonLabel: string|undefined): Promise<string[]> {
  let startDir = app.getPath('home')

  if (isDir(config.get('dialogPaths.askDirDialog'))) {
    startDir = config.get('dialogPaths.askDirDialog')
  }

  const options: OpenDialogOptions = {
    title: title,
    buttonLabel: buttonLabel,
    defaultPath: startDir,
    properties: [
      'openDirectory',
      'createDirectory' // macOS only
    ]
  }

  let response: OpenDialogReturnValue
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status vs. promise awaits.
  if (win !== null && [ 'darwin', 'win32' ].includes(process.platform)) {
    response = await dialog.showOpenDialog(win, options)
  } else {
    response = await dialog.showOpenDialog(options)
  }

  // Save the path of the dir into the config
  if (!response.canceled && response.filePaths.length > 0) {
    config.set('dialogPaths.askDirDialog', response.filePaths[0])
  }

  if (response.canceled) {
    return []
  } else {
    return response.filePaths
  }
}
