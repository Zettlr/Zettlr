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
import fs from 'fs'
import { app, ipcMain } from 'electron'
import EventEmitter from 'events'

import broadcastIpcMessage from '../../common/util/broadcast-ipc-message'

export default class CssProvider extends EventEmitter {
  private readonly _filePath: string

  constructor () {
    super()
    global.log.verbose('CSS provider booting up ...')
    this._filePath = path.join(app.getPath('userData'), 'custom.css')

    // Check for the existence of the custom CSS file. If it is not existent,
    // create an empty one.
    try {
      fs.lstatSync(this._filePath)
    } catch (e) {
      // Create an empty file with a nice initial comment in it.
      fs.writeFileSync(this._filePath, '/* Enter your custom CSS here */\n\n')
    }

    // Inject the global provider functions
    global.css = {
      on: (event, callback) => { this.on(event, callback) },
      off: (event, callback) => { this.off(event, callback) },
      get: () => { return this.get() },
      getPath: () => { return this.getPath() },
      set: (newContent) => { return this.set(newContent) }
    }

    // Send the Custom CSS Path to whomever requires it
    ipcMain.on('css-provider', (event, message) => {
      const { command } = message
      if (command === 'get-custom-css-path') {
        event.sender.send('css-provider', {
          command: 'get-custom-css-path',
          payload: this._filePath
        })
      } else if (command === 'set-custom-css') {
        const { payload } = message
        this.set(payload)
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
  get (): string {
    let file = fs.readFileSync(this._filePath, 'utf8')
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
  set (newContent: string): boolean {
    try {
      fs.writeFileSync(this._filePath, newContent)
      this.emit('update', this._filePath)
      broadcastIpcMessage('css-provider', {
        command: 'get-custom-css-path',
        payload: this._filePath
      })
      return true
    } catch (e) {
      return false
    }
  }
}
