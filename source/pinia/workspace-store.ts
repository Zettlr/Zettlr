/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        useWorkspaceStore
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This store manages all loaded files and folders including
 *                  their descriptors.
 *
 * END HEADER
 */

import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useConfigStore } from './config'
import { type AnyDescriptor } from 'source/types/common/fsal'

const ipcRenderer = window.ipc

async function readPathRecursively (absPath: string): Promise<string[]> {
  return await ipcRenderer.invoke('fsal', { command: 'read-path-recursively', payload: absPath })
}

async function getDescriptorFor (absPath: string): Promise<AnyDescriptor> {
  return await ipcRenderer.invoke('fsal', { command: 'get-descriptor', payload: absPath })
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const configStore = useConfigStore()

  const openPaths = computed(() => configStore.config.openPaths)

  const workspaceMap = ref<Map<string, string[]>>(new Map())
  const descriptorMap = ref<Map<string, AnyDescriptor>>(new Map())
  const rootDescriptors = ref<AnyDescriptor[]>([])

  for (const rootPath of openPaths.value) {
    readPathRecursively(rootPath)
      .then(response => { workspaceMap.value.set(rootPath, response) })
      .catch(err => console.error(`[Workspace Store] Could not retrieve path: "${rootPath}"`, err))
  }

  // Update the loaded workspaces as soon as the openPaths property changes.
  watch(openPaths, async (value, oldValue) => {
    // Retrieve all new paths to load.
    const pathsToLoad: string[] = []
    for (const newPath of value) {
      if (!oldValue.includes(newPath)) {
        pathsToLoad.push(newPath)
      }
    }

    // Fetch the new paths.
    for (const rootPath of pathsToLoad) {
      try {
        const response = await readPathRecursively(rootPath)
        workspaceMap.value.set(rootPath, response)
      } catch (err) {
        console.error(`[Workspace Store] Could not retrieve path: "${rootPath}"`, err)
      }
    }

    // Unload any path no longer part of the open paths.
    for (const oldPath of oldValue) {
      if (!value.includes(oldPath)) {
        workspaceMap.value.delete(oldPath)
      }
    }
  })

  // Next section: Keep the descriptor map up to date
  watch(workspaceMap, value => {
    for (const root of value.keys()) {
      const contents = value.get(root)
      if (contents === undefined) {
        throw new Error(`[Workspace Store] Could not retrieve contents for root path "${root}"`)
      }
      for (const child of contents) {
        getDescriptorFor(child)
          .then(descriptor => descriptorMap.value.set(child, descriptor))
          .catch(err => console.error(`Could not fetch descriptor for pah "${child}"`, err))
      }
    }
  }, { deep: true })

  watch(descriptorMap, value => {
    rootDescriptors.value = openPaths.value
      .filter(rootPath => value.has(rootPath))
      .map(rootPath => value.get(rootPath)!)
  }, { deep: true })

  return { workspaceMap, descriptorMap, rootDescriptors }
})
