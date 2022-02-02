/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CSSProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Makes the custom CSS available throughout the app.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs } from 'fs'
import { app, ipcMain } from 'electron'
import EventEmitter from 'events'

import broadcastIpcMessage from '@common/util/broadcast-ipc-message'

export default class CssProvider extends EventEmitter {
  private readonly _filePath: string

  constructor () {
    super()
    global.log.verbose('CSS provider booting up ...')
    this._filePath = path.join(app.getPath('userData'), 'custom.css')

    // Check for the existence of the custom CSS file. If it is not existent,
    // create an empty one.
    fs.lstat(this._filePath)
      .catch(e => {
        // Create an empty file with a nice initial comment in it.
        fs.writeFile(this._filePath, '/* Enter your custom CSS here */\n\n', { encoding: 'utf8' })
          .catch(e => {
            global.log.error(`[CSS Provider] Could not create Custom CSS file: ${e.message as string}`, e)
          })
      })

    // Inject the global provider functions
    global.css = {
      on: (event, callback) => { this.on(event, callback) },
      off: (event, callback) => { this.off(event, callback) },
      getPath: () => { return this.getPath() }
    }

    // Send the Custom CSS Path to whomever requires it
    ipcMain.handle('css-provider', async (event, payload) => {
      const { command } = payload
      if (command === 'get-custom-css-path') {
        return this._filePath
      } else if (command === 'get-custom-css') {
        return await this.get()
      } else if (command === 'set-custom-css') {
        const { css } = payload
        return await this.set(css)
      }
    })
  }

  /**
   * Shuts down the provider
   * @return {boolean} Whether or not the shutdown was successful
   */
  shutdown (): boolean {
    global.log.verbose('CSS provider shutting down ...')
    return true
  }

  /**
   * Retrieves the content of the custom CSS file
   * @return {string} The custom CSS
   */
  async get (): Promise<string> {
    const file = await fs.readFile(this._filePath, { encoding: 'utf8' })
    return file
  }

  /**
   * The renderer will need this path to dynamically load it in.
   * @return {string} The fully qualified path to the CSS file.
   */
  getPath (): string { return this._filePath }

  /**
   * Writes new data to the custom CSS file, and returns if the call succeeded.
   * @param {string} newContent The new contents
   * @return {boolean} Whether or not the call succeeded.
   */
  async set (newContent: string): Promise<boolean> {
    try {
      await fs.writeFile(this._filePath, newContent, { encoding: 'utf8' })
      this.emit('update', this._filePath)
      broadcastIpcMessage('css-provider', {
        command: 'get-custom-css-path',
        payload: this._filePath
      })
      broadcastIpcMessage('css-provider', { command: 'custom-css-updated' })
      return true
    } catch (err: any) {
      global.log.error(`[CSS Provider] Could not set custom css: ${err.message as string}`, err)
      return false
    }
  }
}
