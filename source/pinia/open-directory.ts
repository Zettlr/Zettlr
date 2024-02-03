/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useOpenDirectoryStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the currently open directory store.
 *
 * END HEADER
 */

import type { DirDescriptor } from '@dts/common/fsal'
import { defineStore } from 'pinia'
import { type Ref, ref } from 'vue'

const ipcRenderer = window.ipc

function updateOpenDirectory (openDirectoryRef: Ref<DirDescriptor|null>): void {
  ipcRenderer.invoke('application', { command: 'get-open-directory' })
    .then((result: DirDescriptor|null) => {
      openDirectoryRef.value = result
    })
    .catch(err => { console.error(`[Pinia] Could not fetch open directory: ${err.message as string}`) })
}

export const useOpenDirectoryStore = defineStore('open-directory', () => {
  const openDirectory = ref<DirDescriptor|null>(null)

  // Initial getting of the open directory
  updateOpenDirectory(openDirectory)

  // Listen to subsequent changes
  ipcRenderer.on('documents-provider', (event, data) => {
    if (data === 'openDirectory') {
      updateOpenDirectory(openDirectory)
    }
  })

  return { openDirectory }
})
