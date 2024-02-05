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
import { ref, watch, type Ref } from 'vue'
import { useDocumentTreeStore } from './document-tree-store'
import type { SearchResultWrapper } from 'source/types/common/search'
import { type ColoredTag } from 'source/app/service-providers/tags'
import { type WritingTarget } from '@providers/targets'

const ipcRenderer = window.ipc

async function updateSnippets (snippets: Ref<Array<{ name: string, content: string }>>): Promise<void> {
  // Now we have to pair two types of calls to the assets provider to get all
  // snippets: First a call to list all snippets, and then one `get` call to
  // retrieve its file contents.
  const snippetNames: string[] = await ipcRenderer.invoke('assets-provider', {
    command: 'list-snippets'
  })

  snippets.value = []
  for (const snippet of snippetNames) {
    const content: string = await ipcRenderer.invoke('assets-provider', {
      command: 'get-snippet',
      payload: { name: snippet }
    })

    snippets.value.push({ name: snippet, content })
  }
}

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
  const coloredTags = ref<ColoredTag[]>([])
  const snippets = ref<Array<{ name: string, content: string }>>([])
  const writingTargets = ref<WritingTarget[]>([])

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

  // Central management for a few things that various components need
  // Colored tags
  ipcRenderer.on('colored-tags', (event) => {
    ipcRenderer.invoke('tag-provider', { command: 'get-colored-tags' })
      .then(tags => { coloredTags.value = tags })
      .catch(e => console.error(e))
  })

  ipcRenderer.invoke('tag-provider', { command: 'get-colored-tags' })
    .then(tags => { coloredTags.value = tags })
    .catch(e => console.error(e))

  // Snippets
  ipcRenderer.on('assets-provider', (event, what: string) => {
    if (what === 'snippets-updated') {
      updateSnippets(snippets).catch(e => console.error(e))
    }
  })

  updateSnippets(snippets).catch(e => console.error(e))

  // Writing targets
  ipcRenderer.on('targets-provider', (event, what: string) => {
    if (what === 'writing-targets-updated') {
      ipcRenderer.invoke('targets-provider', { command: 'get-targets' })
        .then((targets: WritingTarget[]) => { writingTargets.value = targets })
        .catch(e => console.error(e))
    }
  })

  ipcRenderer.invoke('targets-provider', { command: 'get-targets' })
    .then((targets: WritingTarget[]) => { writingTargets.value = targets })
    .catch(e => console.error(e))

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
    searchResults,
    coloredTags,
    snippets,
    writingTargets
  }
})
