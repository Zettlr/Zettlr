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
import { ref, computed } from 'vue'

const ipcRenderer = window.ipc

type AnyDescriptor = DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor
export const useWorkspacesStore = defineStore('workspaces', () => {
  const roots = ref<Array<{ descriptor: AnyDescriptor, version: number }>>([])
  const rootPaths = computed<string[]>(() => { return roots.value.map(root => root.descriptor.path) })

  // TODO: In the future, to only get a select set of workspaces, use the window
  // ID to query the document provider to provide us here with the actual root
  // paths that we should load, and then use the payload of the initial tree
  // data receiver to specify only specific workspaces to be loaded.

  // TODO: Fetch the initial set of roots from main, then set up a listener to
  // update them whenever changes happen.

  ipcRenderer.invoke('workspace-provider', {
    command: 'get-initial-tree-data',
    payload: '' // TODO: Use this property to specify a specific root later on.
  })
    .then((response: InitialTreeData[]) => {
      for (const data of response) {
        const { descriptor, changes, currentVersion } = data
        mergeEventsIntoTree(changes, descriptor)
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
        if (Array.isArray(response)) {
          // We have received a regular amount of updates
          roots.value.splice(idx, 1, {
            descriptor: mergeEventsIntoTree(response, root.descriptor),
            version: root.version + response.length
          })
        } else {
          // We have been outdated -> replace the root
          roots.value.splice(idx, 1, {
            descriptor: mergeEventsIntoTree(response.changes, response.descriptor),
            version: response.currentVersion
          })
        }
      })
      .catch(err => console.error(`Could not fetch updates for root path ${rootPath}: ${err.message as string}`))
  })

  return { roots, rootPaths }
})
