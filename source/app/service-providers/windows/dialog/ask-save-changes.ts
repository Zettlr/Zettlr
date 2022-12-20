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
import { trans } from '@common/i18n-main'

/**
 * Displays a prompt to ask the user if they want to save the files first
 *
 * @param   {BrowserWindow|null}  win      The window to attach to
 */
export default async function askSaveChanges (win: BrowserWindow|null): Promise<MessageBoxReturnValue> {
  const boxOptions: MessageBoxOptions = {
    type: 'warning',
    buttons: [
      trans('Proceed without saving'), // 0: Omit all changes
      trans('Save'), // 1: Save all changes
      trans('Cancel') // 2: Abort whatever is happening
    ],
    defaultId: 1,
    cancelId: 2, // If the user cancels, do not omit (the default) but actually cancel
    title: trans('Omit unsaved changes?'),
    message: trans('There are unsaved changes to the current file. Do you want to omit them or save?')
  }

  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status vs. promise awaits.
  if (win !== null && [ 'darwin', 'win32' ].includes(process.platform)) {
    return await dialog.showMessageBox(win, boxOptions)
  } else {
    return await dialog.showMessageBox(boxOptions)
  }
}
