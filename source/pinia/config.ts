/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useConfigStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the configuration
 *
 * END HEADER
 */

import { type ConfigOptions } from '@providers/config/get-config-template'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useConfigStore = defineStore('config', () => {
  const config = ref<ConfigOptions>(window.config.get())

  // Listen to subsequent changes
  ipcRenderer.on('config-provider', (event, { command, payload }) => {
    if (command === 'update') {
      config.value = window.config.get()
    }
  })

  return { config }
})
