/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useColoredTagsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages colored tags
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { ColoredTag } from 'source/app/service-providers/tags'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useColoredTagsStore = defineStore('colored-tags', () => {
  const tags = ref<ColoredTag[]>([])

  // Listen to subsequent changes
  ipcRenderer.on('tag-provider', (event) => {
    ipcRenderer.invoke('tag-provider', { command: 'get-colored-tags' })
      .then((t: ColoredTag[]) => {
        tags.value = t
      })
      .catch(err => console.error(err))
  })

  ipcRenderer.invoke('tag-provider', { command: 'get-colored-tags' })
    .then((t: ColoredTag[]) => {
      tags.value = t
    })
    .catch(err => console.error(err))

  return { tags }
})
