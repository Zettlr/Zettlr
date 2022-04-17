/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateOpenDirectoryAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the open directory from the main process
 *
 * END HEADER
 */

import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  const directory = await ipcRenderer.invoke('application', { command: 'get-open-directory' })
  const curDir = context.state.selectedDirectory

  if (curDir === null && directory === null) {
    return // The above is only true if both are null
  } else if (curDir !== null && curDir.path === directory.path) {
    return // Same directory, nothing to update
  }

  context.commit('updateOpenDirectory', directory)

  // In case the user quickly switched, we need to re-run this
  context.dispatch('updateOpenDirectory').catch(e => console.error(e))
}
