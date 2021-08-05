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
