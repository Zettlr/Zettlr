/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useWritingTargetsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the writing targets
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { WritingTarget } from 'source/app/service-providers/targets'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useWritingTargetsStore = defineStore('writing-targets', () => {
  const targets = ref<WritingTarget[]>([])

  // Listen to subsequent changes
  ipcRenderer.on('targets-provider', (event, command) => {
    if (command === 'writing-targets-updated') {
      ipcRenderer.invoke('targets-provider', { command: 'get-targets' })
        .then((t: WritingTarget[]) => {
          targets.value = t
        })
        .catch(err => console.error(err))
    }
  })

  ipcRenderer.invoke('targets-provider', { command: 'get-targets' })
    .then((t: WritingTarget[]) => {
      targets.value = t
    })
    .catch(err => console.error(err))

  return { targets }
})
