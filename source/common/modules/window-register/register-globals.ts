/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        registerGlobals
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This utility function registers necessary globals inside the
 *                  renderer; notably the configuration getters and setters so
 *                  that every file running in a BrowserWindow can access config
 *                  variables and other providers.
 *
 * END HEADER
 */

const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

export default function registerGlobals (): void {
  // Register globals

  // What we are doing here is setting up a special communications channel
  // with the main process to receive config values. This way it is much
  // easier to access the configuration from throughout the whole renderer
  // process.
  global.config = {
    get: (key?: string) => {
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
        command: 'set-config-single',
        payload: {
          key: key,
          val: val
        }
      })
    },
    on: () => {
      console.warn('[Window Registration] Called global.config.on in a renderer context.')
    },
    off: () => {
      console.warn('[Window Registration] Called global.config.off in a renderer context.')
    },
    addPath: (p: string) => {
      console.warn('[Window Registration] Called global.config.addPath in a renderer context.', p)
      return false
    },
    removePath: (p: string) => {
      console.warn('[Window Registration] Called global.config.removePath in a renderer context.', p)
      return false
    },
    /**
     * If true, Zettlr assumes this is the first start of the app
     */
    isFirstStart: () => {
      console.warn('[Window Registration] Called global.config.isFirstStart in a renderer context.')
      return false
    },
    /**
     * If true, Zettlr has detected a change in version in the config
     */
    newVersionDetected: () => {
      console.warn('[Window Registration] Called global.config.newVersionDetected in a renderer context.')
      return false
    }
  }
}
