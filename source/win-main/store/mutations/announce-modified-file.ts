/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AnnounceModifiedFileMutation
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Updates the list of currently modified files
 *
 * END HEADER
 */

import { ZettlrState } from '..'

const ipcRenderer = window.ipc

export default function (state: ZettlrState, payload: any): void {
  const { filePath, isClean } = payload
  // Since Proxies cannot intercept push and splice operations, we have to
  // re-assign the modifiedDocuments if a change occurred, so that attached
  // watchers are notified of this. An added benefit is that we can already
  // de-proxy the array here to send it across the IPC bridge.
  const newModifiedDocuments = state.modifiedDocuments.map(e => e)
  const pathIndex = newModifiedDocuments.findIndex(e => e === filePath)

  if (isClean === false && pathIndex === -1) {
    // Add the path if not already done
    newModifiedDocuments.push(filePath)
    ipcRenderer.invoke('application', {
      command: 'update-modified-files',
      payload: newModifiedDocuments
    })
      .catch(e => console.error(e))
    state.modifiedDocuments = newModifiedDocuments
  } else if (isClean === true && pathIndex > -1) {
    // Remove the path if in array
    newModifiedDocuments.splice(pathIndex, 1)
    ipcRenderer.invoke('application', {
      command: 'update-modified-files',
      payload: newModifiedDocuments
    })
      .catch(e => console.error(e))
    state.modifiedDocuments = newModifiedDocuments
  }
}
