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
import { ref, watch, computed } from 'vue'
import { useConfigStore } from './config'
import type { OtherFileDescriptor, AnyDescriptor } from 'source/types/common/fsal'
import { useDocumentTreeStore } from '.'
import { isAbsolutePath, pathDirname, pathExtname, resolvePath } from 'source/common/util/renderer-path-polyfill'
import { trans } from 'source/common/i18n-renderer'
import { hasImageExt, hasDataExt, hasMSOfficeExt, hasOpenOfficeExt, hasPDFExt } from 'source/common/util/file-extention-checks'

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
 * Returns a single descriptor from main for the provided path.
 *
 * @param   {string}                  absPath  The absolute path
 *
 * @return  {Promise<AnyDescriptor>}           The descriptor for path.
 */
async function getDescriptorFor (absPath: string): Promise<AnyDescriptor> {
  return await ipcRenderer.invoke('fsal', { command: 'get-descriptor', payload: absPath })
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

export const useWorkspaceStore = defineStore('workspace', () => {
  // Dependent stores and watched variables
  const configStore = useConfigStore()
  const documentTreeStore = useDocumentTreeStore()
  const { lastLeafActiveFile } = storeToRefs(documentTreeStore)

  // SECTION 1: WORKSPACES AND FILE DESCRIPTORS
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

  // Keep the descriptor map up to date
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

  // SECTION 2: ATTACHMENTS/OTHER FILES
  const otherFiles = ref<Array<{ path: string, files: OtherFileDescriptor[] }>>([])

  // Update whenever the lastLeafActiveFile changes
  watch(lastLeafActiveFile, async () => {
    console.log('lastLeafActiveFile changed! Reloading other files ...')
    const activeFile = documentTreeStore.lastLeafActiveFile
    if (activeFile === undefined) {
      console.log('Active file is undefined')
      otherFiles.value = []
      return
    }

    const descriptor = descriptorMap.value.get(pathDirname(activeFile.path))
    if (descriptor === undefined || descriptor.type !== 'directory') {
      console.log('Could not find directory descriptor')
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

  return { workspaceMap, descriptorMap, rootDescriptors, otherFiles }
})
