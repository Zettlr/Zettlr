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
export default function promptDialog (logger: LogProvider, win: BrowserWindow|null, options: any): void {
  if (typeof options === 'string') {
    options = { 'message': options }
  }

  const boxOptions: MessageBoxOptions = {
    type: 'info',
    buttons: [trans('Ok')],
    defaultId: 0,
    title: 'Zettlr',
    message: options.message
  }

  if (options.type !== undefined) {
    boxOptions.type = options.type as string
  }

  if (options.title !== undefined) {
    boxOptions.title = options.title as string
  }

  // The showmessageBox-function returns a promise,
  // nevertheless, we don't need a return.
  // DEBUG: Trying to resolve bug #1645, which seems to relate to modal status vs. promise awaits.
  if (win !== null && [ 'darwin', 'win32' ].includes(process.platform)) {
    dialog.showMessageBox(win, options)
      .catch(e => logger.error('[Window Manager] Prompt threw an error', e))
  } else {
    dialog.showMessageBox(options)
      .catch(e => logger.error('[Window Manager] Prompt threw an error', e))
  }
}
