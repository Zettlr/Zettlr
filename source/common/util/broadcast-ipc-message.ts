/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        broadcastIPCMessage
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file enables anything in the main process to broadcast
 *                  an IPC message to every single browser window that is
 *                  currently open.
 *
 * END HEADER
 */

import { BrowserWindow } from 'electron'

/**
 * Broadcasts an IPC message to all open windows
 *
 * @param   {string}  channel  The channel to broadcast on
 * @param   {any[]}   args     Any amount of arguments to be passed to the call
 */
export default function broadcastIPCMessage (channel: string, ...args: any[]): void {
  const allWindows = BrowserWindow.getAllWindows()

  for (const window of allWindows) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    window.webContents.send(channel, ...args)
  }
}
