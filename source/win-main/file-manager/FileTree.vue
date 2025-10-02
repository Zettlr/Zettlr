<template>
  <div
    id="file-tree"
    role="region"
    aria-label="File Tree"
    v-bind:class="{ 'hidden': !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-on:click="clickHandler"
  >
    <template v-if="fileTree.length > 0">
      <div v-if="getFilteredTree.length === 0" class="empty-tree">
        <div class="info">
          {{ noResultsMessage }}
        </div>
      </div>

      <template v-if="getFiles.length > 0">
        <div
          id="directories-files-header"
          v-on:click="configStore.setConfigValue('fileManagerShowFiles', !showFilesSection)"
        >
          <cds-icon
            shape="angle"
            v-bind:direction="showFilesSection ? 'down' : 'right'"
            role="presentation"
          ></cds-icon>

          <cds-icon
            v-if="platform !== 'darwin'"
            shape="file"
            role="presentation"
          ></cds-icon>
          
          {{ fileSectionHeading }}
        </div>

        <template v-if="showFilesSection">
          <TreeItem
            v-for="item in getFiles"
            v-bind:key="item.path"
            v-bind:obj="item"
            v-bind:depth="0"
            v-bind:active-item="activeTreeItem?.[0]"
            v-bind:is-currently-filtering="filterQuery.trim() !== ''"
            v-bind:has-duplicate-name="getFiles.filter(i => i.name === item.name).length > 1"
            v-bind:window-id="props.windowId"
            v-on:toggle-file-list="emit('toggle-file-list')"
          >
          </TreeItem>
        </template>
      </template>

      <template v-if="getDirectories.length > 0">
        <div
          id="directories-dirs-header"
          v-on:click="configStore.setConfigValue('fileManagerShowWorkspaces', !showWorkspacesSection)"
        >
          <cds-icon
            shape="angle"
            v-bind:direction="showWorkspacesSection ? 'down' : 'right'"
            role="presentation"
          ></cds-icon>

          <cds-icon
            v-if="platform !== 'darwin'"
            shape="tree-view"
            role="presentation"
          ></cds-icon>
          
          {{ workspaceSectionHeading }}
        </div>

        <template v-if="showWorkspacesSection">
          <TreeItem
            v-for="item in getDirectories"
            v-bind:key="item.path"
            v-bind:obj="item"
            v-bind:is-currently-filtering="filterQuery.length > 0"
            v-bind:depth="0"
            v-bind:active-item="activeTreeItem?.[0]"
            v-bind:has-duplicate-name="getDirectories.filter(i => i.name === item.name).length > 1"
            v-bind:window-id="props.windowId"
            v-on:toggle-file-list="emit('toggle-file-list')"
          >
          </TreeItem>
        </template>
      </template>
    </template>
    <template v-else>
      <div class="empty-tree" v-on:click="requestOpenRoot">
        <div class="info">
          {{ noRootsMessage }}
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileTree
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the FSAL file tree contents as a tree.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import TreeItem from './TreeItem.vue'
import matchQuery from './util/match-query'
import matchTree from './util/match-tree'
import { ref, computed } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWindowStateStore, useWorkspacesStore } from 'source/pinia'
import { type AnyDescriptor } from '@dts/common/fsal'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

const ipcRenderer = window.ipc

/**
 * Flattens one element of the filtered directory tree into a one-dimensional
 * array, taking into account only uncollapsed (=visible) directories.
 *
 * @param   {AnyDescriptor}       elem         The element to flatten
 * @param   {string[]|undefined}  uncollapsed  A list of opened directories. Pass undefined to return all directories
 * @param   {AnyDescriptor[]}     arr          A list to append to (for recursion)
 *
 * @return  {AnyDescriptor[]}                  The flattened list
 */
function getFlattenedVisibleFileTree (elem: AnyDescriptor, uncollapsed: string[]|undefined, arr: AnyDescriptor[] = []): AnyDescriptor[] {
  // Add the current element
  if (elem.type !== 'other') {
    // TODO: Once we enable displaying of otherfiles in the file tree, we MUST
    // replace this with a check of whether that setting is on!
    arr.push(elem)
  }

  // Include children only when we either are filtering (uncollapsed = undefined)
  // or if the directory is actually visible
  if (elem.type === 'directory' && (uncollapsed === undefined || uncollapsed.includes(elem.path))) {
    for (const child of elem.children) {
      arr = getFlattenedVisibleFileTree(child, uncollapsed, arr)
    }
  }

  return arr
}

const props = defineProps<{
  isVisible: boolean
  filterQuery: string
  windowId: string
}>()

const emit = defineEmits<{
  (e: 'selection', event: MouseEvent): void
  (e: 'toggle-file-list'): void
}>()

// Can contain the path to a tree item that is focused
const activeTreeItem = ref<undefined|[string, string]>(undefined)

const workSpacesStore = useWorkspacesStore()
const configStore = useConfigStore()
const windowStateStore = useWindowStateStore()
const documentTreeStore = useDocumentTreeStore()

const showFilesSection = computed(() => configStore.config.fileManagerShowFiles)
const showWorkspacesSection = computed(() => configStore.config.fileManagerShowWorkspaces)

const platform = process.platform
const fileSectionHeading = trans('Files')
const workspaceSectionHeading = trans('Workspaces')
const noRootsMessage = trans('No open files or folders')
const noResultsMessage = trans('No results')

const fileTree = computed<AnyDescriptor[]>(() => workSpacesStore.roots.map(root => root.descriptor))
const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))
const lastLeafId = computed(() => documentTreeStore.lastLeafId)

const getFilteredTree = computed<AnyDescriptor[]>(() => {
  const q = props.filterQuery.trim().toLowerCase()

  if (q === '') {
    return fileTree.value
  }

  const filter = matchQuery(q, useTitle.value, useH1.value)
  // Now we can actually filter out the file tree. We have to do this recursively.
  // We will perform a depth-first search and keep every directory which either
  // (a) matches directly or (b) has an amount of filtered children > 0
  const filteredTree = []
  for (const item of fileTree.value) {
    if (item.type === 'directory') {
      // Recursively match the directory
      const result = matchTree(item, filter)
      if (result !== undefined) {
        filteredTree.push(result)
      }
    } else if (filter(item)) {
      // Add the file, since it matches
      filteredTree.push(item)
    }
  }
  return filteredTree
})

const getFiles = computed(() => {
  // NOTE: These are the root files. We'll only allow Markdown and code files here.
  return getFilteredTree.value.filter(item => item.type === 'file' || item.type === 'code')
})

const getDirectories = computed(() => {
  return getFilteredTree.value.filter(item => item.type === 'directory')
})

const uncollapsedDirectories = computed(() => {
  return windowStateStore.uncollapsedDirectories
})

const flattenedSimpleFileTree = computed<Array<[string, string]>>(() => {
  // First, take the filtered tree and flatten it
  let list: AnyDescriptor[] = []
  const uncollapsedDirs: string[]|undefined = (props.filterQuery.length === 0) ? uncollapsedDirectories.value : undefined

  getFilteredTree.value.forEach(elem => {
    list = list.concat(getFlattenedVisibleFileTree(elem, uncollapsedDirs))
  })

  const flatArray: Array<[string, string]> = []
  for (const elem of list) {
    // We need the type to check if we can uncollapse/collapse a directory
    flatArray.push([ elem.path, elem.type ])
  }
  return flatArray
})

/**
 * Called whenever the user clicks on the "No open files or folders"
 * message -- it requests to open a new folder from the main process.
 * @param  {MouseEvent} evt The click event.
 * @return {void}     Does not return.
 */
function requestOpenRoot (_event: MouseEvent): void {
  ipcRenderer.invoke('application', { command: 'root-open-workspaces' })
    .catch(err => console.error(err))
}

function clickHandler (event: MouseEvent): void {
  // We need to bubble this event upwards so that the file manager is informed of the selection
  emit('selection', event)
}

function navigate (event: KeyboardEvent): void {
  // The user requested to navigate into the file tree with the keyboard
  // Only capture arrow movements
  if (![ 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape' ].includes(event.key)) {
    return
  }

  event.stopPropagation()
  event.preventDefault()

  if (event.key === 'Escape') {
    activeTreeItem.value = undefined
    return
  }

  if (flattenedSimpleFileTree.value.length === 0) {
    return // Nothing to navigate
  }

  if (event.key === 'Enter' && activeTreeItem.value !== undefined) {
    // Open the currently active item
    if (activeTreeItem.value[1] === 'directory') {
      configStore.setConfigValue('openDirectory', activeTreeItem.value[0])
    } else {
      // Select the active file (if there is one)
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: {
          path: activeTreeItem.value[0],
          windowId: props.windowId,
          leafId: lastLeafId.value,
          newTab: false
        }
      } as DocumentManagerIPCAPI)
        .catch(e => console.error(e))
    }
  }

  // Get the current index of the current active file
  let currentIndex = flattenedSimpleFileTree.value.findIndex(val => val[0] === activeTreeItem.value?.[0])

  switch (event.key) {
    case 'ArrowDown':
      currentIndex++
      break
    case 'ArrowUp':
      currentIndex--
      break
    case 'ArrowLeft':
      // Close a directory if applicable
      if (currentIndex > -1 && flattenedSimpleFileTree.value[currentIndex][1] === 'directory') {
        const path = flattenedSimpleFileTree.value[currentIndex][0]
        const idx = windowStateStore.uncollapsedDirectories.indexOf(path)
        if (idx > -1) {
          windowStateStore.uncollapsedDirectories.splice(idx, 1)
        }
      }
      return
    case 'ArrowRight':
      // Open a directory if applicable
      if (currentIndex > -1 && flattenedSimpleFileTree.value[currentIndex][1] === 'directory') {
        const path = flattenedSimpleFileTree.value[currentIndex][0]
        if (!windowStateStore.uncollapsedDirectories.includes(path)) {
          windowStateStore.uncollapsedDirectories.push(path)
        }
      }
      return
  }

  // Sanitize the index
  if (currentIndex > flattenedSimpleFileTree.value.length - 1) {
    currentIndex = flattenedSimpleFileTree.value.length - 1
  } else if (currentIndex < 0) {
    currentIndex = 0
  }

  // Set the active tree item
  activeTreeItem.value = flattenedSimpleFileTree.value[currentIndex]
}

function stopNavigate (): void {
  activeTreeItem.value = undefined
}

defineExpose({ navigate, stopNavigate })
</script>

<style lang="less">
// @list-item-height: 20px;

body {
  #file-tree {
    position: relative;
    width: 100%;
    height: 100%;
    left: 0%;
    overflow-x: hidden;
    overflow-y: auto;
    outline: none;
    transition: left 0.3s ease, background-color 0.2s ease;

    &.hidden { left:-100%; }

    #directories-dirs-header, #directories-files-header {
      display: flex;
      gap: 10px;
      align-items: center;

      clr-icon {
        width: 12px;
        height: 12px;
        margin-left: 3px;
        margin-right: 3px;
        vertical-align: bottom;
      }
    }

    .list-item {
      position: relative;
    }

    .empty-tree {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        text-align: center;
        cursor: pointer; // Indicate that the user can click the area

        .info {
            display: block;
            padding: 10px;
            margin-top: 50%;
            font-weight: bold;
            font-size: 200%;
        }
    }
  }
}

body.darwin {
  #file-tree {
    // On macOS, a file-tree will be a sidebar, cf.:
    // https://developer.apple.com/design/human-interface-guidelines/macos/windows-and-views/sidebars/

    #directories-dirs-header, #directories-files-header {
      border: none; // TODO: This comes from a theme
      color: rgb(160, 160, 160);
      font-weight: bold;
      font-size: inherit;
      margin: 20px 0px 5px 10px;

      clr-icon { display: none; }
    }
  }
}

body.win32 {
  #file-tree {
    #directories-dirs-header, #directories-files-header {
      border-bottom: 1px solid rgb(160, 160, 160);
      font-size: 11px;
      padding: 5px 0px 5px 10px;
      margin: 0px 0px 5px 0px;
    }
  }

  &.dark {
    #file-tree {
      background-color: rgb(30, 30, 40);
    }
  }
}

body.linux {
  #file-tree {
    #directories-dirs-header, #directories-files-header {
      border-bottom: 1px solid rgb(160, 160, 160);
      font-size: 11px;
      padding: 5px 0px 5px 10px;
      margin: 0px 0px 5px 0px;
    }
  }

  &.dark {
    #file-tree {
      background-color: rgb(rgb(40, 40, 50));
    }
  }
}
</style>
