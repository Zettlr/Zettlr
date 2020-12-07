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

import { BrowserWindow, dialog, MessageBoxOptions } from 'electron'
import { trans } from '../../../../common/i18n'

/**
 * Asks the user for confirmation, if the file identified by filename should
 * be overwritten in the main window
 *
 * @param   {BrowserWindow}     win       The main window
 * @param   {string}            filename  The file in question
 *
 * @return  {Promise<boolean>}            Resolves to true, if the file should be replaced
 */
export default async function shouldReplaceFileDialog (win: BrowserWindow, filename: string): Promise<boolean> {
  let options: MessageBoxOptions = {
    type: 'question',
    title: trans('system.replace_file_title'),
    message: trans('system.replace_file_message', filename),
    checkboxLabel: trans('dialog.preferences.always_reload_files'),
    checkboxChecked: global.config.get('alwaysReloadFiles'),
    buttons: [
      trans('system.cancel'),
      trans('system.ok')
    ],
    cancelId: 0,
    defaultId: 1
  }

  // Asynchronous message box to not block the main process
  let response = await dialog.showMessageBox(win, options)

  global.config.set('alwaysReloadFiles', response.checkboxChecked)

  return response.response === 1
}
