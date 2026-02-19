<template>
  <div
    id="file-tree"
    role="region"
    aria-label="File Tree"
    v-bind:class="{ 'hidden': !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-on:click="clickHandler"
    v-on:pointerenter="hover = true"
    v-on:pointerleave="hover = false"
  >
    <template v-if="rootDescriptors.length > 0">
      <div v-if="filterQuery.trim() !== '' && filterResults.length === 0" class="empty-tree">
        <div class="info">
          {{ noResultsMessage }}
        </div>
      </div>

      <template v-if="getFiles.length > 0">
        <div
          id="directories-files-header"
          v-bind:title="showClose ? 'Close all files' : showFilesSection ? 'Hide files' : 'Show files'"
          v-on:click="showClose ? undefined : configStore.setConfigValue('fileManagerShowFiles', !showFilesSection)"
        >
          <cds-icon
            role="presentation"
            v-bind:shape="showClose ? 'times' : 'angle'"
            v-bind:direction="showClose ? undefined : showFilesSection ? 'down' : 'right'"
            v-bind:status="showClose ? 'danger' : undefined"
            v-bind:class="{ 'close-all': showClose }"
            v-on:dblclick="showClose ? closeAllFiles() : undefined"
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
            v-bind:item="item"
            v-bind:depth="0"
            v-bind:active-item="activeTreeItem?.[0]"
            v-bind:filter-results="filterResults"
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
          v-bind:title="showClose ? 'Close all workspaces' : showWorkspacesSection ? 'Hide workspaces' : 'Show workspaces'"
          v-on:click="showClose ? undefined : configStore.setConfigValue('fileManagerShowWorkspaces', !showWorkspacesSection)"
        >
          <cds-icon
            role="presentation"
            v-bind:shape="showClose ? 'times' : 'angle'"
            v-bind:direction="showClose ? undefined : showWorkspacesSection ? 'down' : 'right'"
            v-bind:status="showClose ? 'danger' : undefined"
            v-bind:class="{ 'close-all': showClose }"
            v-on:dblclick="showClose ? closeAllWorkspaces() : undefined"
          ></cds-icon>

          <cds-icon
            v-if="platform !== 'darwin'"
            shape="tree-view"
            role="presentation"
          ></cds-icon>

          {{ workspaceSectionHeading }}

          <cds-icon
            role="presentation"
            shape="minus-circle"
            class="collapse-all"
            v-on:click.prevent="collapseAll()"
          ></cds-icon>
        </div>

        <template v-if="showWorkspacesSection">
          <TreeItem
            v-for="item in getDirectories"
            v-bind:key="item.path"
            v-bind:item="item"
            v-bind:filter-results="filterResults"
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWindowStateStore } from 'source/pinia'
import { useWorkspaceStore } from 'source/pinia/workspace-store'
import { retrieveChildrenAndSort } from './util/retrieve-children-and-sort'
import type { AnyDescriptor } from 'source/types/common/fsal'
import { getSorter } from 'source/common/util/directory-sorter'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'
import { pathDirname } from 'source/common/util/renderer-path-polyfill'
import { closeFile, closeWorkspace } from './util/item-composable'

const ipcRenderer = window.ipc

const props = defineProps<{
  isVisible: boolean
  filterQuery: string
  windowId: string
}>()

const emit = defineEmits<{
  (e: 'selection', event: MouseEvent): void
  (e: 'toggle-file-list'): void
}>()

const shiftHeld = ref(false)
const hover = ref(false)
const showClose = computed(() => shiftHeld.value && hover.value)

function onKeyDown (e: KeyboardEvent) {
  if (e.key === 'Shift') {
    shiftHeld.value = true
  }
}

function onKeyUp (e: KeyboardEvent) {
  if (e.key === 'Shift') {
    shiftHeld.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

// Can contain the path to a tree item that is focused
const activeTreeItem = ref<undefined|[string, string]>(undefined)

const workspaceStore = useWorkspaceStore()
const windowStateStore = useWindowStateStore()
const documentTreeStore = useDocumentTreeStore()
const configStore = useConfigStore()

const rootDescriptors = computed(() => workspaceStore.rootDescriptors)

const showFilesSection = computed(() => configStore.config.fileManagerShowFiles)
const showWorkspacesSection = computed(() => configStore.config.fileManagerShowWorkspaces)
const lastLeafId = computed(() => documentTreeStore.lastLeafId)

const platform = process.platform
const fileSectionHeading = trans('Files')
const workspaceSectionHeading = trans('Workspaces')
const noRootsMessage = trans('No open files or folders')
const noResultsMessage = trans('No results')

const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))

const query = computed(() => props.filterQuery.trim().toLowerCase())

const filterResults = computed<string[]>(() => {
  const q = query.value
  if (q === '') {
    return []
  }

  const filter = matchQuery(q, useTitle.value, useH1.value)
  const results: string[] = []

  for (const [ absPath, descriptor ] of workspaceStore.descriptorMap.entries()) {
    if (filter(descriptor)) {
      results.push(absPath)
    }
  }

  return results
})

const getFiles = computed(() => {
  // NOTE: These are the root files. We'll only allow Markdown and code files here.
  const roots = rootDescriptors.value.filter(desc => desc.type === 'file' || desc.type === 'code')
  const q = query.value
  if (q === '') {
    return roots
  }

  return roots.filter(root => filterResults.value.includes(root.path))
})

const getDirectories = computed(() => {
  const roots = rootDescriptors.value.filter(desc => desc.type === 'directory')
  const q = query.value
  if (q === '') {
    return roots
  }

  return roots.filter(root => {
    return filterResults.value.some(res => res.startsWith(root.path))
  })
})

const flatSortedAndFilteredVisualFileDescriptors = computed<Array<[string, string]>>(() => {
  // First, get all descriptors.
  const allDescriptors = [...workspaceStore.descriptorMap.values()]
  // Second, filter them if applicable.
    .filter(descriptor => {
      return query.value === '' ? true : filterResults.value.some(res => res.startsWith(descriptor.path))
    })

  const uncollapsed = windowStateStore.uncollapsedDirectories
  const collapsed = allDescriptors
    .filter(d => d.type === 'directory' && !uncollapsed.includes(d.path))
    .map(d => d.path)

  const visibleDescriptors = allDescriptors
    // Third, remove any file that is within a collapsed directory
    .filter(descriptor => {
      return collapsed.find(absPath => descriptor.dir.startsWith(absPath)) === undefined
    })

  // Fourth, sort them recursively so that the list is the same as what the file
  // tree will see
  const retValue: AnyDescriptor[] = [
    ...getFiles.value
  ]

  const { sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime } = configStore.config
  const sorter = getSorter(sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime)

  for (const descriptor of getDirectories.value) {
    retValue.push(...retrieveChildrenAndSort(descriptor, visibleDescriptors, sorter))
  }
  return retValue.map(descriptor => ([ descriptor.path, descriptor.type ]))
})

/**
 * Called whenever the user clicks on the "No open files or folders"
 * message -- it requests to open a new folder from the main process.
 * @param  {MouseEvent} evt The click event.
 * @return {void}     Does not return.
 */
function requestOpenRoot (event: MouseEvent): void {
  let command = 'root-open-workspaces'
  if (event.shiftKey) {
    command = 'root-open-files'
  }

  ipcRenderer.invoke('application', { command })
    .catch(err => console.error(err))
}

function collapseAll (): void {
  windowStateStore.uncollapsedDirectories.splice(0)
}

function closeAllFiles (): void {
  for (const rootFile of getFiles.value) {
    closeFile(rootFile.path, documentTreeStore.paneData, props.windowId)
  }
}

function closeAllWorkspaces (): void {
  for (const dir of getDirectories.value) {
    closeWorkspace(dir.path, documentTreeStore.paneData, props.windowId)
  }
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

  if (flatSortedAndFilteredVisualFileDescriptors.value.length === 0) {
    return // Nothing to navigate
  }

  if (event.key === 'Enter' && activeTreeItem.value !== undefined) {
    // Open the currently active item
    if (activeTreeItem.value[0] === 'directory') {
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
  let currentIndex = flatSortedAndFilteredVisualFileDescriptors.value.findIndex(val => val[0] === activeTreeItem.value?.[0])

  switch (event.key) {
    case 'ArrowDown':
      currentIndex++
      break
    case 'ArrowUp':
      currentIndex--
      break
    case 'ArrowLeft':
      // Close a directory if applicable
      if (currentIndex > -1 && flatSortedAndFilteredVisualFileDescriptors.value[currentIndex][1] === 'directory') {
        const path = flatSortedAndFilteredVisualFileDescriptors.value[currentIndex][0]
        const idx = windowStateStore.uncollapsedDirectories.indexOf(path)
        if (idx > -1) {
          windowStateStore.uncollapsedDirectories.splice(idx, 1)
        }
        return // No need to update activeTreeItem
      } else if (currentIndex > -1 && flatSortedAndFilteredVisualFileDescriptors.value[currentIndex][1] !== 'directory') {
        const path = pathDirname(flatSortedAndFilteredVisualFileDescriptors.value[currentIndex][0])
        const idx = windowStateStore.uncollapsedDirectories.indexOf(path)
        if (idx > -1) {
          windowStateStore.uncollapsedDirectories.splice(idx, 1)
          // Also, here, reset the index to the containing directory. If that was not found, currentIndex is -1
          // meaning navigation stops.
          currentIndex = flatSortedAndFilteredVisualFileDescriptors.value.findIndex(x => x[0] === path)
        }
      }
      break
    case 'ArrowRight':
      // Open a directory if applicable
      if (currentIndex > -1 && flatSortedAndFilteredVisualFileDescriptors.value[currentIndex][1] === 'directory') {
        const path = flatSortedAndFilteredVisualFileDescriptors.value[currentIndex][0]
        if (!windowStateStore.uncollapsedDirectories.includes(path)) {
          windowStateStore.uncollapsedDirectories.push(path)
        }
      }
      return // No need to update activeTreeItem
  }

  // Sanitize the index
  if (currentIndex > flatSortedAndFilteredVisualFileDescriptors.value.length - 1) {
    currentIndex = flatSortedAndFilteredVisualFileDescriptors.value.length - 1
  } else if (currentIndex < 0) {
    currentIndex = 0
  }

  // Set the active tree item
  activeTreeItem.value = flatSortedAndFilteredVisualFileDescriptors.value[currentIndex]
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

    cds-icon {
      width: 18px;
      height: 18px;
    }

    &.hidden { left:-100%; }

    #directories-dirs-header, #directories-files-header {
      display: flex;
      gap: 10px;
      align-items: center;

      cds-icon {
        margin-left: 3px;
        margin-right: 3px;
        vertical-align: bottom;
      }
    }

    .close-all:hover {
      border-radius: 20%;
      background-color: rgb(200, 200, 200);
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

  &.dark {
    #file-tree {
      .close-all:hover {
        background-color: rgb(80, 80, 80);
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
