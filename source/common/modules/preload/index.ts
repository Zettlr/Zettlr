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

import { contextBridge, ipcRenderer, clipboard } from 'electron'
import path from 'path'

contextBridge.exposeInMainWorld('path', path)

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

// Expose the subset of clipboard functions which we use
contextBridge.exposeInMainWorld('clipboard', {
  readText: function () {
    return clipboard.readText()
  },
  readHTML: function () {
    return clipboard.readHTML()
  },
  readRTF: function () {
    return clipboard.readRTF()
  },
  hasImage: function () {
    // NOTE: We cannot send NativeImages across the context bridge,
    // so we have to do it the hard way here.
    return !clipboard.readImage().isEmpty()
  },
  getImageData: function () {
    // NOTE: This function is used only in the Paste-Image dialog in order to
    // show a preview of the image and populate the dialog with the necessary
    // information.
    const image = clipboard.readImage()
    const size = image.getSize() // First get the original size
    const aspect = image.getAspectRatio() // Then the aspect
    const dataUrl = image.resize({ 'height': 200 }).toDataURL()

    return {
      size,
      aspect,
      dataUrl
    }
  },
  write: function (data: Electron.Data) {
    // We cannot transfer images, so make sure the function is safe to call
    return clipboard.write({
      text: data.text,
      html: data.html,
      rtf: data.rtf
    })
  },
  writeText: function (text: string) {
    return clipboard.writeText(text)
  },
  hasSelectionClipboard: function () {
    if (process.platform !== 'linux') {
      return false
    }

    if (clipboard.readText('selection') !== '') {
      return true
    }

    if (clipboard.readHTML('selection') !== '') {
      return true
    }

    return false
  },
  /**
   * Returns the plain text and HTML contents of the selection clipboard on
   * linux.
   *
   * @return  {{text: string, html: string}}}  Returns an object containing HTML and text contents
   */
  getSelectionClipboard: function () {
    if (process.platform !== 'linux') {
      return {
        text: '',
        html: ''
      }
    } else {
      return {
        text: clipboard.readText('selection'),
        html: clipboard.readHTML('selection')
      }
    }
  }
})

// Expose the subset of process properties we need
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  version: process.version,
  versions: process.versions,
  arch: process.arch,
  uptime: process.uptime,
  getSystemVersion: process.getSystemVersion(),
  env: Object.assign({}, process.env),
  argv: process.argv
})
