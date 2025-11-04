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

import { defineStore, storeToRefs } from 'pinia'
import { type Ref, ref, watch, computed } from 'vue'
import { useConfigStore } from './config'
import type { OtherFileDescriptor, AnyDescriptor } from 'source/types/common/fsal'
import { useDocumentTreeStore } from '.'
import { isAbsolutePath, pathDirname, pathExtname, resolvePath } from 'source/common/util/renderer-path-polyfill'
import { trans } from 'source/common/i18n-renderer'
import { hasImageExt, hasDataExt, hasMSOfficeExt, hasOpenOfficeExt, hasPDFExt } from 'source/common/util/file-extention-checks'
import type { FSALEventPayload } from 'source/app/service-providers/fsal'

const ipcRenderer = window.ipc

/**
 * Reads in an entire (workspace) path into a 1d array of absolute file paths.
 *
 * @param   {string}             absPath  The path to read
 *
 * @return  {Promise<string>[]}           A list of everything recursively within the path.
 */
async function readPathRecursively (absPath: string): Promise<string[]> {
  return await ipcRenderer.invoke('fsal', { command: 'read-path-recursively', payload: absPath })
}

/**
 * Returns a single or multiple descriptors from main for the provided path.
 *
 * @param   {string}                  absPath  The absolute path
 *
 * @return  {Promise<AnyDescriptor>}           The descriptor for path.
 */
async function getDescriptorFor (absPath: string): Promise<AnyDescriptor>
async function getDescriptorFor (absPath: string[]): Promise<AnyDescriptor[]>
async function getDescriptorFor (absPath: string|string[]): Promise<AnyDescriptor|AnyDescriptor[]> {
  return await ipcRenderer.invoke('fsal', {
    command: 'get-descriptor',
    // De-proxy as necessary
    payload: Array.isArray(absPath) ? absPath.map(p => p) : absPath
  })
}

/**
 * Reads in a single directory from main and returns their descriptors.
 *
 * @param   {string}                    absPath  The path to read in
 *
 * @return  {Promise<AnyDescriptor>[]}           The descriptors.
 * 
 * @throws if the path is not a directory
 */
async function readDirectory (absPath: string): Promise<AnyDescriptor[]> {
  return await ipcRenderer.invoke('fsal', { command: 'read-directory', payload: absPath })
}

// In order to avoid frequent updates of the workspaceMap on initial load, we
// retrieve the bulk immediately on load, and then only patch where necessary.
async function retrieveInitialUpdate (rootPaths: string[], workspaceMap: Ref<Map<string, string[]>>, descriptorMap: Ref<Map<string, AnyDescriptor>>) {
  let start = Date.now()
  const entries: Array<[string, string[]]> = []
  const flatMap: string[] = []
  for (const rootPath of rootPaths) {
    const response = await readPathRecursively(rootPath)
    entries.push([ rootPath, response ])
    flatMap.push(...response)
  }
  console.log(`Fetched all paths in ${Date.now() - start}ms`)
  start = Date.now()

  // Now do one huge roundtrip to main to fetch every descriptor at once.
  const descriptors = await getDescriptorFor(flatMap)
  console.log(`Fetched all descriptors in ${Date.now() - start}ms`)

  // Now we can set the stuff immediately
  workspaceMap.value = new Map(entries)
  descriptorMap.value = new Map(descriptors.map(d => ([ d.path, d ])))
}

export const useWorkspaceStore = defineStore('workspace', () => {
  // Dependent stores and watched variables
  const configStore = useConfigStore()
  const documentTreeStore = useDocumentTreeStore()
  const { lastLeafActiveFile } = storeToRefs(documentTreeStore)

  // SECTION 1: WORKSPACES AND FILE DESCRIPTORS
  const openPaths = ref(configStore.config.openPaths)

  const workspaceMap = ref<Map<string, string[]>>(new Map())
  const pathList = computed(() => ([...workspaceMap.value.values()].flat()))
  const descriptorMap = ref<Map<string, AnyDescriptor>>(new Map())
  const rootDescriptors = ref<AnyDescriptor[]>([])

  const isLoading = ref(true)

  retrieveInitialUpdate(openPaths.value, workspaceMap, descriptorMap)
    .catch(err => console.error('[Workspace Store] Could not retrieve initial set of loaded paths', err))
    .finally(() => {
      isLoading.value = false
      // Now we can set up the watchers. (We need to do this afterwards to not cause a hiccup)
      // Finally, listen to FSAL events and keep the descriptor map updated.
      ipcRenderer.on('fsal-event', (_, payload: FSALEventPayload) => {
        // @ts-expect-error asdasd
        console.log(`[WorkspaceStore] Received event ${payload.event}:${payload.path ?? payload.descriptor.path}`)
        if (payload.event === 'unlink' || payload.event === 'unlinkDir') {
          const root = [...workspaceMap.value.keys()].find(p => payload.path.startsWith(p))
          if (root !== undefined) {
            const arr = workspaceMap.value.get(root)!
            arr.splice(arr.indexOf(payload.path), 1)
            workspaceMap.value.set(root, arr)
          }

          descriptorMap.value.delete(payload.path)
        } else if (payload.event === 'change' || payload.event === 'add' || payload.event === 'addDir') {
          const root = [...workspaceMap.value.keys()].find(p => payload.descriptor.path.startsWith(p))
          if (root !== undefined && payload.event !== 'change') {
            const arr = workspaceMap.value.get(root)!
            arr.push(payload.descriptor.path)
            workspaceMap.value.set(root, arr)
          }

          descriptorMap.value.set(payload.descriptor.path, payload.descriptor)
        }
      })
    })

  // Update the loaded workspaces as soon as the openPaths property changes.
  configStore.$subscribe((_mutation, state) => {
    openPaths.value = state.config.openPaths
  })

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

  // Keep the descriptor map up to date
  watch(workspaceMap, value => {
    if (isLoading.value) {
      return // The loader will update the descriptorMap once with a huge chunk of updates.
    }

    for (const root of value.keys()) {
      const contents = value.get(root)!
      getDescriptorFor(contents)
        .then(descriptors => descriptors.map(d => descriptorMap.value.set(d.path, d)))
        .catch(err => console.error(`Could not fetch descriptors for path "${root}"`, err))
    }
  }, { deep: true })

  watch(descriptorMap, value => {
    rootDescriptors.value = openPaths.value
      .filter(rootPath => value.has(rootPath))
      .map(rootPath => value.get(rootPath)!)
  }, { deep: true })

  // SECTION 2: ATTACHMENTS/OTHER FILES
  const otherFiles = ref<Array<{ path: string, files: OtherFileDescriptor[] }>>([])

  // Update whenever the lastLeafActiveFile changes
  watch(lastLeafActiveFile, async () => {
    const activeFile = documentTreeStore.lastLeafActiveFile
    if (activeFile === undefined) {
      otherFiles.value = []
      return
    }

    const descriptor = descriptorMap.value.get(pathDirname(activeFile.path))
    if (descriptor === undefined || descriptor.type !== 'directory') {
      otherFiles.value = []
      return
    }

    const { files, attachmentExtensions, editor } = configStore.config

    const assetsDir = editor.defaultSaveImagePath.trim()
    const showImages = files.images.showInSidebar
    const showDataFiles = files.dataFiles.showInSidebar
    const showOfficeFiles = files.msoffice.showInSidebar
    const showOpenOffice = files.openOffice.showInSidebar
    const showPDF = files.pdf.showInSidebar

    // Quick helper function that tests whether the provided attachment should be
    // shown in the sidebar. This essentially tests the file's extension and
    // returns true if it shuld shown in the sidebar.
    const shouldShowAttachment = (filePath: string): boolean => {
      return attachmentExtensions.includes(pathExtname(filePath).toLowerCase()) ||
        (showImages && hasImageExt(filePath)) ||
        (showDataFiles && hasDataExt(filePath)) ||
        (showOfficeFiles && hasMSOfficeExt(filePath)) ||
        (showOpenOffice && hasOpenOfficeExt(filePath)) ||
        (showPDF && hasPDFExt(filePath))
    }

    const children = await readDirectory(descriptor.path)
    const dirAttachments = children
      .filter((child): child is OtherFileDescriptor => child.type === 'other')
      .filter(attachment => shouldShowAttachment(attachment.path))

    const att = [{ path: trans('Current folder'), files: dirAttachments }]

    const assetsDescriptor = isAbsolutePath(assetsDir)
      ? descriptorMap.value.get(assetsDir)
      : descriptorMap.value.get(resolvePath(descriptor.path, assetsDir))

    if (assetsDescriptor !== undefined) {
      const assetsFiles = await readDirectory(assetsDescriptor.path)
      const files = assetsFiles
        .filter((child): child is OtherFileDescriptor => child.type === 'other')
        .filter(attachment => shouldShowAttachment(attachment.path))

      att.push({ path: assetsDir, files })
    }

    otherFiles.value = att
  })

  return { workspaceMap, pathList, descriptorMap, rootDescriptors, otherFiles }
})
