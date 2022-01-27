import { IpcRenderer } from 'electron'
import { PromisfiedProtocol } from './ipc'

export const ipcRenderer: PromisfiedProtocol & IpcRenderer = new Proxy({}, {
  get (target: any, propChannel: PropertyKey, receiver: any): any {
    const electronIpcRenderer = (window as any).ipc as Electron.IpcRenderer

    const channel = propChannel.toString()
    // For backwards compatibility
    if (channel === 'invoke') {
      return electronIpcRenderer.invoke
    } else if (channel === 'on') {
      return electronIpcRenderer.on
    }

    return new Proxy({}, {
      get (target: any, propMessage: PropertyKey, receiver: any): any {
        const message = propMessage.toString()
        return async function (...args: any[]) {
          return await electronIpcRenderer.invoke(channel, { command: message, payload: args })
        }
      }
    })
  }
})
