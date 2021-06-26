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

/**
 * Displays a prompt to ask the user if they want to save the files first
 *
 * @param   {BrowserWindow|null}  win      The window to attach to
 */
export default async function askSaveChanges (win: BrowserWindow|null): Promise<MessageBoxReturnValue> {
  const boxOptions: MessageBoxOptions = {
    type: 'warning',
    buttons: [
      'Close without saving changes',
      'Save changes'
    ],
    defaultId: 1,
    title: 'Zettlr',
    message: 'There are unsaved changes. Do you want to save them before closing the window?'
  }

  // The showmessageBox-function returns a promise,
  // nevertheless, we don't need a return.
  // DEBUG: Testing out to never make dialogs modal in response to issue #1645
  // Currently, we only make dialogs modal on macOS and Windows.
  if (win !== null && [ 'darwin', 'win32' ].includes(process.platform)) {
    return await dialog.showMessageBox(win, boxOptions)
  } else {
    return await dialog.showMessageBox(boxOptions)
  }
}
