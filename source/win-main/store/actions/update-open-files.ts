/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateOpenFilesAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the open files from the main process
 *
 * END HEADER
 */

import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  const openFiles = await ipcRenderer.invoke('application', { command: 'get-open-files' })
  context.commit('updateOpenFiles', openFiles)
}
