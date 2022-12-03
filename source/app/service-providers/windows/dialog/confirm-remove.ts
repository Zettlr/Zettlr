/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        confirmRemove
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A message box asking to remove the given file/directory
 *
 * END HEADER
 */

import { BrowserWindow, dialog, MessageBoxOptions, MessageBoxReturnValue } from 'electron'
import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import { trans } from '@common/i18n-main'

/**
 * Displays a dialog to confirm the removal of the given descriptor.
 *
 * @param   {BrowserWindow}                                      win         The Window to attach to
 * @param   {MDFileDescriptor|CodeFileDescriptor|DirDescriptor}  descriptor  The descriptor
 *
 * @return  {Promise<boolean>}                                               Returns true if the confirmation was successful.
 */
export default async function confirmRemove (win: BrowserWindow|null, descriptor: MDFileDescriptor|CodeFileDescriptor|DirDescriptor): Promise<boolean> {
  const options: MessageBoxOptions = {
    type: 'warning',
    buttons: [ trans('Ok'), trans('Cancel') ],
    defaultId: 0,
    cancelId: 1,
    title: trans('Really delete?'),
    message: trans('Do you really want to remove %s?', descriptor.name)
  }

  let response: MessageBoxReturnValue
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status vs. promise awaits.
  if (win !== null && [ 'darwin', 'win32' ].includes(process.platform)) {
    response = await dialog.showMessageBox(win, options)
  } else {
    response = await dialog.showMessageBox(options)
  }

  // 0 = Ok, 1 = Cancel
  return response.response === 0
}
