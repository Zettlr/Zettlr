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

import { dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'
import { trans } from '@common/i18n-main'
import type LogProvider from '@providers/log'

/**
 * Displays a prompt with information
 *
 * @param   {BrowserWindow|null}  win      The window to attach to
 * @param   {any}            options  Options for the message box
 */
export default function promptDialog (logger: LogProvider, win: BrowserWindow|null, options: Partial<MessageBoxOptions> & { message: string }|string): void {
  if (typeof options === 'string') {
    options = { message: options }
  }

  const boxOptions: MessageBoxOptions = {
    type: options.type ?? 'info',
    buttons: [trans('Ok')],
    defaultId: 0,
    title: options.title ?? 'Zettlr',
    message: options.message
  }

  // The showmessageBox-function returns a promise,
  // nevertheless, we don't need a return.
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status
  // vs. promise awaits. UPDATE 2024-03-11: In response to #4952, removing the
  // platform check again.
  if (win !== null) {
    dialog.showMessageBox(win, boxOptions)
      .catch(e => logger.error('[Window Manager] Prompt threw an error', e))
  } else {
    dialog.showMessageBox(boxOptions)
      .catch(e => logger.error('[Window Manager] Prompt threw an error', e))
  }
}
