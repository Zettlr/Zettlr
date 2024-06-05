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
import { ref, computed, watch, type Ref } from 'vue'
import locateByPath from '@providers/fsal/util/locate-by-path'
import { useConfigStore } from '.'
import { getSorter } from '@providers/fsal/util/directory-sorter'
import { sortDirectory } from '@providers/workspaces/sort-all-directories'

const ipcRenderer = window.ipc

type AnyDescriptor = DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor
type RootRefValue = Array<{ descriptor: AnyDescriptor, version: number }>

// Indicates whether the sequential root updater mechanism is currently working
let rootUpdaterWorking = false
// Contains a list of update requests
const updateRequests: Array<() => Promise<void>> = []

/**
 * Processes a single update request. By working through updates one after the
 * other, we avoid applying the same update multiple times. Worst case: A bunch
 * of requests will not modify the roots.
 */
async function processNextRootUpdateRequest (): Promise<void> {
  if (rootUpdaterWorking) {
    return // We must process through the requests sequentially
  }
  const nextRequest = updateRequests.shift()
  if (nextRequest === undefined) {
    return // Nothing to do
  }

  rootUpdaterWorking = true
  await nextRequest()
  rootUpdaterWorking = false
  await processNextRootUpdateRequest()
}

/**
 * Fetches updates for the given rootPath to synchronize the provided root.
 *
 * @param   {string}                         rootPath      The root path
 * @param   {Ref<RootRefValue>}              roots         The reactive roots
 */
async function updateRoot (rootPath: string, roots: Ref<RootRefValue>): Promise<void> {
  const { sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime } = useConfigStore().config
  const sorter = getSorter(sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime)
  const root = roots.value.find(root => root.descriptor.path === rootPath)

  if (root === undefined) {
    // If the root is undefined, then we are reacting to a workspace-added event.
    try {
      const response: InitialTreeData = await ipcRenderer.invoke('workspace-provider', {
        command: 'get-changes-since',
        // version: -1 ensures that main will send us back InitialTreeData
        payload: { rootPath, version: -1 }
      })
      // We have been outdated -> replace the root
      roots.value.push({
        descriptor: mergeEventsIntoTree(response.changes, response.descriptor, sorter),
        version: response.currentVersion
      })
      sortRoots(roots)
    } catch (err: any) {
      console.error(`Could not fetch root descriptor ${rootPath}:`, err)
    }
    return
  }

  const idx = roots.value.indexOf(root)

  const response: InitialTreeData|ChangeDescriptor[] = await ipcRenderer.invoke('workspace-provider', {
    command: 'get-changes-since',
    payload: { rootPath, version: root.version }
  })

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
}

/**
 * Sorts the roots in an appropriate order for display: files first, then folders.
 *
 * @param  {Ref<RootRefValue>}  roots  The roots reference
 */
function sortRoots (roots: Ref<RootRefValue>): void {
  const { appLang } = useConfigStore().config
  // We only want to sort the paths based on rudimentary, natural order.
  const coll = new Intl.Collator([ appLang, 'en' ], { numeric: true })
  // First, sort based on a collator to have them in proper order.
  roots.value.sort((a, b) => {
    return coll.compare(a.descriptor.name, b.descriptor.name)
  })

  // And second, separate root files from root dirs.
  roots.value.sort((a, b) => {
    return Number(a.descriptor.type === 'directory') - Number(b.descriptor.type === 'directory')
  })
}

/**
 * This store manages all loaded workspaces for this window
 */
export const useWorkspacesStore = defineStore('workspaces', () => {
  const configStore = useConfigStore()
  const sortingOptions = computed(() => {
    const sorting = configStore.config.sorting
    const sortFoldersFirst = configStore.config.sortFoldersFirst
    const fileNameDisplay = configStore.config.fileNameDisplay
    const appLang = configStore.config.appLang
    const sortingTime = configStore.config.fileMetaTime
    return { sorting, sortFoldersFirst, fileNameDisplay, appLang, sortingTime }
  })

  const roots = ref<RootRefValue>([])

  const rootPaths = computed<string[]>(() => { return roots.value.map(root => root.descriptor.path) })
  const rootDescriptors = computed<AnyDescriptor[]>(() => { return roots.value.map(root => root.descriptor) })

  /**
   * Fetches the provided path's file descriptor.
   *
   * @param   {string}            targetPath  The path to search for
   *
   * @return  {MDFileDescriptor}              The file descriptor, or undefined
   */
  const getFile = (targetPath: string): MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor|undefined => {
    const descriptor = locateByPath(rootDescriptors.value, targetPath)
    if (descriptor !== undefined && descriptor.type === 'directory') {
      return undefined
    } else {
      return descriptor
    }
  }

  /**
   * Fetches the provided path's directory descriptor.
   *
   * @param   {string}         targetPath  The path to search for
   *
   * @return  {DirDescriptor|undefined}    The dir descriptor, or undefined
   */
  const getDir = (targetPath: string): DirDescriptor|undefined => {
    const descriptor = locateByPath(rootDescriptors.value, targetPath)
    if (descriptor?.type !== 'directory') {
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
        sortRoots(roots)
      }
    })
    .catch(err => console.error(`Could not initialize workspacesStore: ${err.message as string}`))

  ipcRenderer.on('workspace-changed', (event, rootPath: string) => {
    if (!rootPaths.value.includes(rootPath)) {
      return // Root not loaded, uninteresting for us.
    }

    updateRequests.push(async () => {
      // By wrapping this in a callable, we basically defer execution
      await updateRoot(rootPath, roots)
    })

    if (rootUpdaterWorking) {
      return // Once the updater is working, it will automatically fetch the new request
    }

    processNextRootUpdateRequest()
      .catch(err => console.error(`Could not process root update request: ${err.message as string}`))
  })

  ipcRenderer.on('workspace-removed', (event, rootPath: string) => {
    const idx = roots.value.findIndex(r => r.descriptor.path === rootPath)
    if (idx > -1) {
      roots.value.splice(idx, 1)
    }
  })

  ipcRenderer.on('workspace-added', (event, rootPath: string) => {
    updateRequests.push(async () => {
      await updateRoot(rootPath, roots)
    })

    if (rootUpdaterWorking) {
      return // Once the updater is working, it will automatically fetch the new request
    }

    processNextRootUpdateRequest()
      .catch(err => console.error(`Could not process root update request: ${err.message as string}`))
  })

  return { roots, rootPaths, rootDescriptors, getFile, getDir }
})
