// PRELOAD SCRIPT

// This script is run on every load of any window. It will introduce necessary
// nodeJS APIs.

import { contextBridge, ipcRenderer, clipboard } from 'electron'
import path from 'path'
import { exposeInContextBridge } from '../../../IpcModule'

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
exposeInContextBridge()

// DEBUG
contextBridge.exposeInMainWorld('__dirname', '')

// Expose the subset of clipboard functions which we use
contextBridge.exposeInMainWorld('clipboard', {
  readText: clipboard.readText,
  readHTML: clipboard.readHTML,
  readRTF: clipboard.readRTF,
  readImage: clipboard.readImage,
  read: clipboard.read,
  write: clipboard.write,
  writeText: clipboard.writeText
})

// Expose the subset of process properties we need
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  version: process.version,
  versions: process.versions,
  arch: process.arch,
  uptime: process.uptime,
  getSystemVersion: process.getSystemVersion(),
  env: Object.assign({}, process.env)
})
