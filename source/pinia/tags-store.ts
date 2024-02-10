/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useTagsStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages tags
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { ColoredTag, TagRecord } from 'source/app/service-providers/tags'
import { ref } from 'vue'

const ipcRenderer = window.ipc

export const useTagsStore = defineStore('tags', () => {
  const coloredTags = ref<ColoredTag[]>([])
  const tags = ref<TagRecord[]>([])

  // Listen to subsequent changes
  ipcRenderer.on('tag-provider', (event, command, payload: TagRecord[]|ColoredTag[]) => {
    if (command === 'colored-tags-updated') {
      coloredTags.value = payload as ColoredTag[]
    } else if (command === 'tags-updated') {
      tags.value = payload as TagRecord[]
    }
  })

  ipcRenderer.invoke('tag-provider', { command: 'get-colored-tags' })
    .then((t: ColoredTag[]) => {
      coloredTags.value = t
    })
    .catch(err => console.error(err))

  ipcRenderer.invoke('tag-provider', { command: 'get-all-tags' })
    .then((t: TagRecord[]) => {
      tags.value = t
    })
    .catch(err => console.error(err))

  return { coloredTags, tags }
})
