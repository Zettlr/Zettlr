/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        shouldOverwriteFileDialog
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a confirmatory dialog
 *
 * END HEADER
 */

import { dialog, type BrowserWindow, type MessageBoxReturnValue, type MessageBoxOptions } from 'electron'
import { trans } from '@common/i18n-main'

/**
 * Asks the user if the file identified by filename should be overwritten
 *
 * @param   {BrowserWindow|null}  win       The window to attach to
 * @param   {string}              filename  The filename
 *
 * @return  {Promise<boolean>}              Returns to true if the user agrees
 */
export default async function shouldOverwriteFileDialog (win: BrowserWindow|null, filename: string): Promise<boolean> {
  const options: MessageBoxOptions = {
    type: 'question',
    title: trans('Overwrite existing file'),
    message: trans('The file %s already exists in this directory. Overwrite?', filename),
    buttons: [
      trans('Cancel'),
      trans('Ok')
    ],
    cancelId: 0,
    defaultId: 1
  }

  // showMessageBox returns a Promise, resolves to:
  let response: MessageBoxReturnValue
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status
  // vs. promise awaits. UPDATE 2024-03-11: In response to #4952, removing the
  // platform check again.
  if (win !== null) {
    response = await dialog.showMessageBox(win, options)
  } else {
    response = await dialog.showMessageBox(options)
  }

  return response.response === 1
}
