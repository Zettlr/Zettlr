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
import { ref, type Ref } from 'vue'
import type { SearchResultWrapper } from 'source/types/common/search'
import { type WritingTarget } from '@providers/targets'
import type { AssetsProviderIPCAPI } from 'source/app/service-providers/assets'

const ipcRenderer = window.ipc

async function updateSnippets (snippets: Ref<Array<{ name: string, content: string }>>): Promise<void> {
  // Now we have to pair two types of calls to the assets provider to get all
  // snippets: First a call to list all snippets, and then one `get` call to
  // retrieve its file contents.
  const snippetNames: string[] = await ipcRenderer.invoke('assets-provider', {
    command: 'list-snippets'
  } as AssetsProviderIPCAPI)

  const newSnippets: Array<{ name: string, content: string }> = []
  for (const snippet of snippetNames) {
    const content: string = await ipcRenderer.invoke('assets-provider', {
      command: 'get-snippet',
      payload: { name: snippet }
    } as AssetsProviderIPCAPI)

    newSnippets.push({ name: snippet, content })
  }

  snippets.value = newSnippets
}

export const useWindowStateStore = defineStore('window-state', () => {
  const uncollapsedDirectories = ref<string[]>([])
  const distractionFreeMode = ref<undefined|string>(undefined)
  const activeDocumentInfo = ref<undefined|DocumentInfo>(undefined)
  const tableOfContents = ref<ToCEntry[]|undefined>(undefined)
  const snippets = ref<Array<{ name: string, content: string }>>([])
  const writingTargets = ref<WritingTarget[]>([])

  /**
   * This variable stores search results from the global search
   */
  const searchResults = ref<SearchResultWrapper[]>([])

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

  return {
    uncollapsedDirectories,
    distractionFreeMode,
    activeDocumentInfo,
    tableOfContents,
    searchResults,
    snippets,
    writingTargets
  }
})
