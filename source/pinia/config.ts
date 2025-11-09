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
import _ from 'underscore'

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

  // Throttle the retrieve function to once a second. We want the config to
  // update some values extremely frequently (e.g., split panel sizes during drag),
  // and with the throttle in place, we ensure that the (sometimes heavy) config
  // updaters don't cause lag.
  //
  // NOTE: This throttling affects ALL config changes, including critical settings
  // like vim mode toggles. This is a known architectural issue - ideally, UI state
  // (split sizes, sidebar visibility) should be in a separate store and only
  // user preferences should use this config system.
  //
  // TODO: Refactor to separate UI state from user preferences (see context/CONFIG_THROTTLING_ISSUE.md)
  const throttledRetrieve = _.throttle(() => {
    config.value = retrieveConfig()
  }, 1000)

  // Listen to subsequent changes
  ipcRenderer.on('config-provider', (event, { command }) => {
    if (command === 'update') {
      throttledRetrieve()
    }
  })

  function setConfigValue (property: string, value: any): boolean {
    const result = ipcRenderer.sendSync('config-provider', {
      command: 'set-config-single',
      payload: { key: property, val: value }
    })

    // IMMEDIATE UPDATE FIX: When a config value is explicitly set (e.g., from
    // preferences window), immediately update the local config without waiting
    // for the throttled broadcast. This ensures critical settings like vim mode
    // toggles take effect instantly rather than waiting up to 1 second.
    //
    // This bypasses the throttle for explicit user actions while still throttling
    // the broadcast updates (which handle frequent UI state changes like split sizes).
    config.value = retrieveConfig()

    return result
  }

  return { config, setConfigValue }
})
