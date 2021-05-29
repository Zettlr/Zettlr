// PRELOAD SCRIPT

// This script is run on every load of any window. It will introduce necessary
// nodeJS APIs.

import { contextBridge, ipcRenderer, clipboard } from 'electron'
import path from 'path'

// Path functions are harmless and can be exposed as-is
contextBridge.exposeInMainWorld('path', { ...path })

// We need a few ipc methods
contextBridge.exposeInMainWorld('ipc', {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  sendSync: (event: string, ...args: any[]) => ipcRenderer.sendSync(event, ...args),
  invoke: async (channel: string, ...args: any[]) => await ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: Function) => ipcRenderer.on(channel, (event, ...args) => {
    // Omit the event when calling the listener
    listener(undefined, ...args)
  })
})

// DEBUG
contextBridge.exposeInMainWorld('__dirname', '')
contextBridge.exposeInMainWorld('clipboard', { ...clipboard })

contextBridge.exposeInMainWorld('process', { platform: process.platform })
