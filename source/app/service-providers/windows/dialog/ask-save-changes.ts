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
  dialog,
  type BrowserWindow,
  type MessageBoxOptions,
  type MessageBoxReturnValue
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
      trans('Yes'), // 0: Save all changes
      trans('No'), // 1: Omit all changes
      trans('Cancel') // 2: Abort whatever is happening
    ],
    defaultId: 0,
    cancelId: 2, // If the user cancels, do not omit (the default) but actually cancel
    title: trans('Unsaved changes'),
    message: trans('There are unsaved changes. Do you want to save them first?')
  }

  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status
  // vs. promise awaits. UPDATE 2024-03-11: In response to #4952, removing the
  // platform check again.
  if (win !== null) {
    return await dialog.showMessageBox(win, boxOptions)
  } else {
    return await dialog.showMessageBox(boxOptions)
  }
}
