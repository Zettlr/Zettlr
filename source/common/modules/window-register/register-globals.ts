import { ipcRenderer } from 'electron'
import applicationMenuHelper from './application-menu-helper'

export default function registerGlobals (): void {
  // Register globals

  // What we are doing here is setting up a special communications channel
  // with the main process to receive config values. This way it is much
  // easier to access the configuration from throughout the whole renderer
  // process.
  global.config = {
    get: (key: string) => {
      // We will send a synchronous event to the main process in order to
      // immediately receive the config value we need. Basically we are pulling
      // the get()-handler from main using the "remote" feature, but we'll
      // implement it ourselves.
      return ipcRenderer.sendSync('config-provider', {
        command: 'get-config',
        payload: {
          key: key
        }
      })
    },
    set: (key: string, val: any) => {
      // Send a synchronous event
      return ipcRenderer.sendSync('config-provider', {
        command: 'set-config',
        payload: {
          key: key,
          val: val
        }
      })
    }
  }

  // Export the menu provider
  global.menuProvider = {
    show: applicationMenuHelper
  }
}
