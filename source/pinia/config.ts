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

/**
 * Synchronously retrieves the configuration
 *
 * @return  {ConfigOptions}  The configuration
 */
function retrieveConfig (): ConfigOptions {
  return ipcRenderer.sendSync('config-provider', { command: 'get-config' })
}

export const useConfigStore = defineStore('config', () => {
  const config = ref<ConfigOptions>(retrieveConfig())

  // Listen to subsequent changes
  ipcRenderer.on('config-provider', (event, { command }) => {
    if (command === 'update') {
      config.value = retrieveConfig()
    }
  })

  function setConfigValue (property: string, value: any): boolean {
    return ipcRenderer.sendSync('config-provider', {
      command: 'set-config-single',
      payload: { key: property, val: value }
    })
  }

  return { config, setConfigValue }
})
