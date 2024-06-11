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

import { app, type BrowserWindow, dialog, type OpenDialogOptions, type OpenDialogReturnValue } from 'electron'
import isDir from '@common/util/is-dir'
import type ConfigProvider from '@providers/config'

/**
 * Asks the user for directory path(s)
 *
 * @param   {BrowserWindow|null}  win  The window to attach to
 * @param title {string}               Title of the Window
 * @param buttonLabel {string|null}    Label of the Button
 * @return  {Promise<string>[]}        Resolves with an array of paths
 */
export default async function askDirectory (config: ConfigProvider, win: BrowserWindow|null, title: string, buttonLabel?: string, message?: string): Promise<string[]> {
  let startDir = app.getPath('home')

  if (isDir(config.get('dialogPaths.askDirDialog'))) {
    startDir = config.get('dialogPaths.askDirDialog')
  }

  const options: OpenDialogOptions = {
    title,
    buttonLabel,
    message,
    defaultPath: startDir,
    properties: [
      'openDirectory',
      'createDirectory' // macOS only
    ]
  }

  let response: OpenDialogReturnValue
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status
  // vs. promise awaits. UPDATE 2024-03-11: In response to #4952, removing the
  // platform check again.
  if (win !== null) {
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
