/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useStatisticsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the app statistics
 *
 * END HEADER
 */

import { type Stats } from '@providers/stats'
import { defineStore } from 'pinia'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useStatisticsStore = defineStore('statistics', () => {
  const stats = ref<Stats>({
    wordCount: {},
    pomodoros: {},
    avgMonth: 0,
    today: 0,
    sumMonth: 0
  })

  // Initial update
  ipcRenderer.invoke('stats-provider', { command: 'get-data' })
    .then(data => { stats.value = data })
    .catch(err => console.error(err))

  // Listen to subsequent updates
  ipcRenderer.on('stats-updated', (event, data: Stats) => {
    stats.value = data
  })

  return { stats }
})
