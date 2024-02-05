/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useWindowState
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This model manages the state for any given main window, i.e.
 *                  values that represent volatile configuration of the window
 *                  UI or UX without affecting other state managers.
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import type { DocumentInfo } from 'source/common/modules/markdown-editor'
import type { ToCEntry } from 'source/common/modules/markdown-editor/plugins/toc-field'
import type { OpenDocument } from 'source/types/common/documents'
import { ref, watch } from 'vue'
import { useDocumentTreeStore } from './document-tree-store'
import type { SearchResultWrapper } from 'source/types/common/search'

const ipcRenderer = window.ipc

// NOTE: THIS STATE IS ONLY INTENDED FOR THE MAIN WINDOW. IT WILL BREAK ON OTHER
// WINDOWS, E.G., DUE TO A LACK OF THE SEARCH PARAM WINDOW_ID!
export const useWindowStateStore = defineStore('window-state', () => {
  const documentTreeStore = useDocumentTreeStore()

  const uncollapsedDirectories = ref<string[]>([])
  const distractionFreeMode = ref<undefined|string>(undefined)
  const lastLeafId = ref<undefined|string>(undefined)
  const lastLeafActiveFile = ref<OpenDocument|undefined>(undefined)
  const activeDocumentInfo = ref<undefined|DocumentInfo>(undefined)
  const tableOfContents = ref<ToCEntry[]|undefined>(undefined)

  /**
   * This variable stores search results from the global search
   */
  const searchResults = ref<SearchResultWrapper[]>([])

  ipcRenderer.on('shortcut', (event, command) => {
    if (command === 'toggle-distraction-free') {
      if (distractionFreeMode.value === undefined && lastLeafId.value !== undefined) {
        distractionFreeMode.value = lastLeafId.value
      } else if (distractionFreeMode.value !== undefined && lastLeafId.value === distractionFreeMode.value) {
        distractionFreeMode.value = undefined
      } else if (distractionFreeMode.value !== undefined && lastLeafId.value !== distractionFreeMode.value) {
        distractionFreeMode.value = lastLeafId.value
      }
    } else if (command === 'delete-file' && lastLeafActiveFile.value !== undefined) {
      ipcRenderer.invoke('application', {
        command: 'file-delete',
        payload: { path: lastLeafActiveFile.value.path }
      })
        .catch(err => console.error(err))
    }
  })

  watch(lastLeafId, () => {
    const leaf = documentTreeStore.paneData.find(leaf => leaf.id === lastLeafId.value)
    if (leaf?.activeFile != null) {
      lastLeafActiveFile.value = leaf.activeFile
    } else {
      lastLeafActiveFile.value = undefined
    }
  })

  return {
    uncollapsedDirectories,
    distractionFreeMode,
    lastLeafId,
    lastLeafActiveFile,
    activeDocumentInfo,
    tableOfContents,
    searchResults
  }
})
