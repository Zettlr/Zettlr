/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateActiveFileAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the active file from the main process
 *
 * END HEADER
 */

import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (context: ActionContext<ZettlrState, ZettlrState>): Promise<void> {
  const openFile = await ipcRenderer.invoke('application', { command: 'get-active-file' })
  const thisActiveFile = context.state.activeFile
  if (openFile === null && thisActiveFile === null) {
    return
  } else if (openFile?.path === thisActiveFile?.path) {
    return
  }

  context.commit('updateActiveFile', openFile)

  // In case the user quickly switched, re-run this dispatcher
  context.dispatch('updateActiveFile').catch(e => console.error(e))
  // Update the tag suggestions
  context.dispatch('regenerateTagSuggestions').catch(e => console.error(e))
  // Update the related files
  context.dispatch('updateRelatedFiles').catch(e => console.error(e))
}
