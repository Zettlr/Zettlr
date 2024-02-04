/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        BrowserWindow preload script
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is being executed by every BrowserWindow instance
 *                  and has the task to provide needed Electron APIs into the
 *                  sandboxed renderers.
 *
 * END HEADER
 */

import { contextBridge, ipcRenderer } from 'electron'

// PREPARATION: Since we have multiple editor panes and all of them need to
// listen to a few events, we need to ramp up some of the channels' max
// listeners. We assume approx. 10 base listeners and will support up to 90 more
// The reason we run into this problem is that the preloader actually shares
// listeners across all windows
ipcRenderer.setMaxListeners(100)

// We need a few ipc methods
contextBridge.exposeInMainWorld('ipc', {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  sendSync: (event: string, ...args: any[]) => ipcRenderer.sendSync(event, ...args),
  invoke: async (channel: string, ...args: any[]) => await ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => {
    // NOTE: We're returning a stopListening() callback here since the function
    // will be cloned across the context bridge, so not the same object, hence
    // it cannot be removed otherwise.
    const callback = (event: any, ...args: any[]): void => {
      // Omit the event when calling the listener
      listener(undefined, ...args)
    }
    ipcRenderer.on(channel, callback)

    return () => ipcRenderer.off(channel, callback)
  }
})

contextBridge.exposeInMainWorld('config', {
  get: function (property?: string) {
    return ipcRenderer.sendSync('config-provider', {
      command: 'get-config',
      payload: { key: property }
    })
  },
  set: function (property: string, value: any) {
    ipcRenderer.sendSync('config-provider', {
      command: 'set-config-single',
      payload: { key: property, val: value }
    })
  }
})

// DEBUG
contextBridge.exposeInMainWorld('__dirname', '')

contextBridge.exposeInMainWorld(
  'getCitationCallback',
  function (database: string): (citations: CiteItem[], composite: boolean) => string|undefined {
    return function (citations: CiteItem[], composite: boolean): string|undefined {
      return ipcRenderer.sendSync('citeproc-provider', {
        command: 'get-citation-sync',
        payload: { database, citations, composite }
      })
    }
  }
)

// Expose the subset of process properties we need
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  version: process.version,
  versions: process.versions,
  arch: process.arch,
  uptime: () => process.uptime(),
  getSystemVersion: process.getSystemVersion(),
  env: Object.assign({}, process.env),
  argv: process.argv
})
