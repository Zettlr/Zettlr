import type { DirDescriptor } from '@dts/common/fsal'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const ipcRenderer = window.ipc

// TODO: Move the open directory management to the documents provider!
export const useOpenDirectoryStore = defineStore('open-directory', () => {
  const openDirectory = ref<DirDescriptor|null>(null)

  // Initial getting of the open directory
  ipcRenderer.invoke('application', { command: 'get-open-directory' })
    .then((result: DirDescriptor|null) => {
      openDirectory.value = result
    })
    .catch(err => { console.error(`[Pinia] Could not fetch open directory: ${err.message as string}`) })

  // Listen to subsequent changes
  ipcRenderer.on('fsal-state-changed', (event, data) => {
    if (data === 'openDirectory') {
      ipcRenderer.invoke('application', { command: 'get-open-directory' })
        .then((result: DirDescriptor|null) => {
          openDirectory.value = result
        })
        .catch(err => { console.error(`[Pinia] Could not fetch open directory: ${err.message as string}`) })
    }
  })

  return { openDirectory }
})
