/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        shouldReplaceFileDialog
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a confirmatory dialog
 *
 * END HEADER
 */

import { dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'
import { trans } from '@common/i18n-main'
import type ConfigProvider from '@providers/config'

/**
 * Asks the user for confirmation, if the file identified by filename should
 * be overwritten in the main window
 *
 * @param   {BrowserWindow}     win       The main window
 * @param   {string}            filename  The file in question
 *
 * @return  {Promise<boolean>}            Resolves to true, if the file should be replaced
 */
export default async function shouldReplaceFileDialog (config: ConfigProvider, win: BrowserWindow, filename: string): Promise<boolean> {
  let options: MessageBoxOptions = {
    type: 'question',
    title: trans('Replace file'),
    message: trans('File %s has been modified remotely. Replace the loaded version with the newer one from disk?', filename),
    checkboxLabel: trans('Always load remote changes to the current file'),
    checkboxChecked: config.get('alwaysReloadFiles'),
    buttons: [
      trans('Cancel'),
      trans('Ok')
    ],
    cancelId: 0,
    defaultId: 1
  }

  // Asynchronous message box to not block the main process
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status
  // vs. promise awaits. UPDATE 2024-03-11: In response to #4952, removing the
  // platform check again.
  const response = await dialog.showMessageBox(win, options)

  config.set('alwaysReloadFiles', response.checkboxChecked)

  return response.response === 1
}
