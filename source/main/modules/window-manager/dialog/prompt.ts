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

import { BrowserWindow, dialog, MessageBoxOptions } from 'electron'

/**
 * Displays a prompt with information
 *
 * @param   {BrowserWindow|null}  win      The window to attach to
 * @param   {any}            options  Options for the message box
 */
export default function promptDialog (win: BrowserWindow|null, options: any): void {
  if (typeof options === 'string') {
    options = { 'message': options }
  }

  const boxOptions: MessageBoxOptions = {
    type: 'info',
    buttons: ['Ok'],
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
  if (win !== null) {
    dialog.showMessageBox(win, options)
      .catch(e => global.log.error('[Window Manager] Prompt threw an error', e))
  } else {
    dialog.showMessageBox(options)
      .catch(e => global.log.error('[Window Manager] Prompt threw an error', e))
  }
}
