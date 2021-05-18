const { BrowserWindow } = require('electron')

/**
 * Broadcasts an IPC message to every open window
 *
 * @param   {string}  channel  The channel to broadcast on
 * @param   {any}  args     Any amount of arguments to be passed to the call
 */
module.exports = function (channel, ...args) {
  const allWindows = BrowserWindow.getAllWindows()

  for (const window of allWindows) {
    window.webContents.send(channel, ...args)
  }
}
