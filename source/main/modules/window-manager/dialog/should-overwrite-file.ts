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

import { BrowserWindow, dialog, MessageBoxReturnValue } from 'electron'
import { trans } from '../../../../common/i18n'

/**
 * Asks the user if the file identified by filename should be overwritten
 *
 * @param   {BrowserWindow|null}  win       The window to attach to
 * @param   {string}              filename  The filename
 *
 * @return  {Promise<boolean>}              Returns to true if the user agrees
 */
export default async function shouldOverwriteFileDialog (win: BrowserWindow|null, filename: string): Promise<boolean> {
  let options = {
    type: 'question',
    title: trans('system.overwrite_file_title'),
    message: trans('system.overwrite_file_message', filename),
    buttons: [
      trans('system.cancel'),
      trans('system.ok')
    ],
    cancelId: 0,
    defaultId: 1
  }

  // showMessageBox returns a Promise, resolves to:
  let response: MessageBoxReturnValue
  if (win !== null) {
    response = await dialog.showMessageBox(win, options)
  } else {
    response = await dialog.showMessageBox(options)
  }

  return (response.response === 1)
}
