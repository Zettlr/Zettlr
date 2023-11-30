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
import ProviderContract from '../provider-contract'
import type LogProvider from '@providers/log'

export default class CssProvider extends ProviderContract {
  private readonly _filePath: string
  private readonly _emitter: EventEmitter

  constructor (private readonly _logger: LogProvider) {
    super()
    this._filePath = path.join(app.getPath('userData'), 'custom.css')

    this._emitter = new EventEmitter()

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

  async boot (): Promise<void> {
    this._logger.verbose('CSS provider booting up ...')

    // Check for the existence of the custom CSS file. If it is not existent,
    // create an empty one.
    try {
      await fs.lstat(this._filePath)
    } catch (err: any) {
      // Create an empty file with a nice initial comment in it.
      await fs.writeFile(this._filePath, '/* Enter your custom CSS here */\n\n', { encoding: 'utf8' })
    }
  }

  /**
   * Shuts down the provider
   * @return {boolean} Whether or not the shutdown was successful
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('CSS provider shutting down ...')
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
      this._emitter.emit('update', this._filePath)
      broadcastIpcMessage('css-provider', {
        command: 'get-custom-css-path',
        payload: this._filePath
      })
      broadcastIpcMessage('css-provider', { command: 'custom-css-updated' })
      return true
    } catch (err: any) {
      this._logger.error(`[CSS Provider] Could not set custom css: ${err.message as string}`, err)
      return false
    }
  }
}
