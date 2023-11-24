/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        WorkspacesStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the workspaces store.
 *
 * END HEADER
 */

import type { CodeFileDescriptor, DirDescriptor, MDFileDescriptor, OtherFileDescriptor } from '@dts/common/fsal'
import type { ChangeDescriptor, InitialTreeData } from '@providers/workspaces/root'
import { mergeEventsIntoTree } from '@providers/workspaces/merge-events-into-tree'
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import locateByPath from '@providers/fsal/util/locate-by-path'
import { useConfigStore } from './config'
import { getSorter } from '@providers/fsal/util/directory-sorter'
import { sortDirectory } from '@providers/workspaces/sort-all-directories'

const ipcRenderer = window.ipc

type AnyDescriptor = DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor

// TODO: Sort the workspaces AGAIN when the configuration pertaining to the
// directory sorting has changed! --> subscribe to the config events
export const useWorkspacesStore = defineStore('workspaces', () => {
  const configStore = useConfigStore()
  const sortingOptions = computed(() => {
    const sorting = configStore.config.sorting
    const sortFoldersFirst = configStore.config.sortFoldersFirst
    const fileNameDisplay = configStore.config.fileNameDisplay
    const appLang = configStore.config.appLang
    const sortingTime = configStore.config.sortingTime
    return { sorting, sortFoldersFirst, fileNameDisplay, appLang, sortingTime }
  })

  const roots = ref<Array<{ descriptor: AnyDescriptor, version: number }>>([])

  const rootPaths = computed<string[]>(() => { return roots.value.map(root => root.descriptor.path) })
  const rootDescriptors = computed<AnyDescriptor[]>(() => { return roots.value.map(root => root.descriptor) })

  const getFile = (targetPath: string): MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor|undefined => {
    const descriptor = locateByPath(rootDescriptors.value, targetPath)
    if (descriptor !== undefined && descriptor.type === 'directory') {
      return undefined
    } else {
      return descriptor
    }
  }

  watch(sortingOptions, () => {
    // Config has changed, so sort all children depending on the new config
    // parameters
    const { sorting, sortFoldersFirst, fileNameDisplay, appLang, sortingTime } = sortingOptions.value
    const sorter = getSorter(sorting, sortFoldersFirst, fileNameDisplay, appLang, sortingTime)

    for (const root of roots.value) {
      if (root.descriptor.type === 'directory') {
        sortDirectory(root.descriptor, sorter)
      }
    }
  })

  // TODO: In the future, to only get a select set of workspaces, use the window
  // ID to query the document provider to provide us here with the actual root
  // paths that we should load, and then use the payload of the initial tree
  // data receiver to specify only specific workspaces to be loaded.

  ipcRenderer.invoke('workspace-provider', {
    command: 'get-initial-tree-data',
    payload: '' // TODO: Use this property to specify a specific root later on.
  })
    .then((response: InitialTreeData[]) => {
      for (const data of response) {
        const { descriptor, currentVersion } = data
        roots.value.push({ descriptor, version: currentVersion })
      }
    })
    .catch(err => console.error(`Could not initialize workspacesStore: ${err.message as string}`))

  ipcRenderer.on('workspace-changed', (event, rootPath: string) => {
    if (!rootPaths.value.includes(rootPath)) {
      return // Root not loaded, uninteresting for us.
    }

    const root = roots.value.find(root => root.descriptor.path === rootPath)

    if (root === undefined) {
      console.error('Could not fetch root descriptor, despite being in rootPaths:', rootPath)
      return
    }

    const idx = roots.value.indexOf(root)

    ipcRenderer.invoke('workspace-provider', {
      command: 'get-changes-since',
      payload: { rootPath, version: root.version }
    })
      .then((response: InitialTreeData|ChangeDescriptor[]) => {
        const { sorting, sortFoldersFirst, fileNameDisplay, appLang, sortingTime } = sortingOptions.value
        const sorter = getSorter(sorting, sortFoldersFirst, fileNameDisplay, appLang, sortingTime)

        if (Array.isArray(response)) {
          // We have received a regular amount of updates
          roots.value.splice(idx, 1, {
            descriptor: mergeEventsIntoTree(response, root.descriptor, sorter),
            version: root.version + response.length
          })
        } else {
          // We have been outdated -> replace the root
          roots.value.splice(idx, 1, {
            descriptor: mergeEventsIntoTree(response.changes, response.descriptor, sorter),
            version: response.currentVersion
          })
        }
      })
      .catch(err => console.error(`Could not fetch updates for root path ${rootPath}: ${err.message as string}`))
  })

  ipcRenderer.on('workspace-removed', (event, rootPath: string) => {
    const idx = roots.value.findIndex(r => r.descriptor.path === rootPath)
    if (idx > -1) {
      roots.value.splice(idx, 1)
    }
  })

  return { roots, rootPaths, rootDescriptors, getFile }
})
