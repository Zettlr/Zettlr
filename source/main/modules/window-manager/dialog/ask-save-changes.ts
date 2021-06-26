/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        promptDialog
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prompts the user with some information
 *
 * END HEADER
 */

import {
  BrowserWindow,
  dialog,
  MessageBoxOptions,
  MessageBoxReturnValue
} from 'electron'
import { trans } from '../../../../common/i18n-main'

/**
 * Displays a prompt to ask the user if they want to save the files first
 *
 * @param   {BrowserWindow|null}  win      The window to attach to
 */
export default async function askSaveChanges (win: BrowserWindow|null): Promise<MessageBoxReturnValue> {
  const boxOptions: MessageBoxOptions = {
    type: 'warning',
    buttons: [
      trans('dialog.button.close_without_saving'),
      trans('dialog.button.save')
    ],
    defaultId: 1,
    title: 'Zettlr',
    message: 'There are unsaved changes. Do you want to save them before closing the window?'
  }

  // The showmessageBox-function returns a promise,
  // nevertheless, we don't need a return.
  if (win !== null) {
    return await dialog.showMessageBox(win, boxOptions)
  } else {
    return await dialog.showMessageBox(boxOptions)
  }
}
