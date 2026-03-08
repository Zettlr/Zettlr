/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        shouldCloseAllDialog
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a confirmatory dialog to close all open files or
 *                  workspaces.
 *
 * END HEADER
 */

import { dialog, type MessageBoxReturnValue, type BrowserWindow, type MessageBoxOptions } from 'electron'
import { trans } from '@common/i18n-main'

/**
 * Asks the user for confirmation if all open files or workspaces should be closed
 *
 * @param   {BrowserWindow|null}  win       The window to attach to
 * @param   {'workspace'|'file'}  rootType  The type of the roots being closed.
 *
 * @return  {Promise<boolean>}              Returns to true if the user agrees
 */
export default async function shouldCloseAllDialog (win: BrowserWindow|null, rootType: 'workspace'|'file'): Promise<boolean> {
  const options: MessageBoxOptions = {
    type: 'question',
    title: trans('Close all %ss', rootType),
    message: trans('Close all %ss', rootType),
    detail: trans('Do you really want to close all %ss?', rootType),
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
