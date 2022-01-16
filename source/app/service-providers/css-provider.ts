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

import broadcastIpcMessage from '@common/util/broadcast-ipc-message'

export function getCSSPath (): string {
  return path.join(app.getPath('userData'), 'custom.css')
}

export async function boot (): Promise<void> {
  // Check for the existence of the custom CSS file. If it is not existent,
  // create an empty one.
  const cssPath = getCSSPath()
  try {
    await fs.lstat(cssPath)
  } catch (err: any) {
    // Create an empty file with a nice initial comment in it.
    await fs.writeFile(cssPath, '/* Enter your custom CSS here */\n\n', { encoding: 'utf8' })
  }

  // Send the Custom CSS Path to whomever requires it
  ipcMain.handle('css-provider', async (event, payload) => {
    const { command } = payload
    if (command === 'get-custom-css-path') {
      return getCSSPath()
    } else if (command === 'get-custom-css') {
      return await getCSS()
    } else if (command === 'set-custom-css') {
      const { css } = payload
      return await setCSS(css)
    }
  })
}

export async function getCSS (): Promise<string> {
  const file = await fs.readFile(getCSSPath(), { encoding: 'utf8' })
  return file
}

export async function setCSS (css: string): Promise<boolean> {
  const cssPath = getCSSPath()
  try {
    await fs.writeFile(cssPath, css, { encoding: 'utf8' })
    broadcastIpcMessage('css-provider', { command: 'get-custom-css-path', payload: cssPath })
    broadcastIpcMessage('css-provider', { command: 'custom-css-updated' })
    return true
  } catch (err: any) {
    global.log.error(`[CSS Provider] Could not set custom css: ${err.message as string}`, err)
    return false
  }
}

export async function shutdown (): Promise<boolean> {
  global.log.verbose('CSS provider shutting down ...')
  return true
}
