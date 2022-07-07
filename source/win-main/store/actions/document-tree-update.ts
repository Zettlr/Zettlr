/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DocumentTreeUpdateAction
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates document tree from main
 *
 * END HEADER
 */

import { DP_EVENTS, BranchNodeJSON, LeafNodeJSON } from '@dts/common/documents'
import { ActionContext } from 'vuex'
import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default async function (ctx: ActionContext<ZettlrState, ZettlrState>, payload: any): Promise<void> {
  const { event, context } = payload
  // For the main window, we also need the window number
  const searchParams = new URLSearchParams(window.location.search)
  const windowId = searchParams.get('window_id')

  if (event === DP_EVENTS.CHANGE_FILE_STATUS && context.status === 'modification') {
    // This event announces newly modified/saved files. We have to create a
    // different commit for that. Also we have to check this prior to the
    // windowNumber, since modification events apply globally
    const modifiedFiles = await ipcRenderer.invoke('documents-provider', { command: 'get-file-modification-status' })
    return ctx.commit('updateModifiedFiles', modifiedFiles)
  }

  // We only tend to events that pertain this window
  if (context.windowId !== windowId) {
    return // None of our business
  }

  // Something in the document status has changed, here we simply pull in
  // the full config as it is in the main process, and dispatch it into
  // the worker who then has the task to apply a delta update with as few
  // changes as possible.
  const treedata: LeafNodeJSON|BranchNodeJSON = await ipcRenderer.invoke('documents-provider', {
    command: 'retrieve-tab-config',
    payload: { windowId }
  })

  ctx.commit('documentTree', { event, context, treedata })
}
