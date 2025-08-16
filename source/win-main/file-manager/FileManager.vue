<template>
  <div
    id="file-manager"
    ref="rootElement"
    role="region"
    aria-label="File Manager"
    v-bind:class="{ expanded: isExpanded }"
    v-on:keydown="maybeNavigate"
    v-on:mouseenter="maybeShowArrowButton"
    v-on:mousemove="maybeShowArrowButton"
    v-on:mouseleave="maybeShowArrowButton"
    v-on:dragover="handleDragOver"
    v-on:wheel="handleWheel"
    v-on:dragstart="lockDirectoryTree"
    v-on:dragend="unlockDirectoryTree"
  >
    <!-- Display the arrow button in case we have a non-combined view -->
    <div
      id="arrow-button"
      ref="arrowButton"
      class="hidden"
      v-on:click="toggleFileList"
    >
      <cds-icon
        role="presentation"
        shape="angle"
        solid="true"
        direction="left"
        size="l"
      ></cds-icon>
    </div>

    <!-- Filter field -->
    <div class="file-manager-filter">
      <input
        ref="quickFilter"
        v-model="filterQuery"
        class="file-manager-filter-input"
        type="search"
        v-bind:placeholder="filterPlaceholder"
        v-on:focus="($event.target as HTMLInputElement).select()"
        v-on:blur="handleQuickFilterBlur"
      />
    </div>

    <div id="component-container">
      <!-- Render a the file-tree -->
      <FileTree
        ref="fileTreeComponent"
        v-bind:is-visible="fileTreeVisible"
        v-bind:filter-query="filterQuery"
        v-bind:window-id="props.windowId"
        v-on:selection="selectionListener"
        v-on:toggle-file-list="toggleFileList"
      ></FileTree>
      <!-- Now render the file list -->
      <!--
        Why are we using both class: hidden (via isFileListVisible) as well
        as v-show? Well, there is a super weird display glitch that will show
        the file list and overlay it over the file tree if we start the app in
        combined mode sometimes. This somehow fixes it, but if anyone has an
        idea what is happening, please come forward.
      -->
      <FileList
        v-show="!isCombined"
        ref="fileListComponent"
        v-bind:is-visible="isFileListVisible"
        v-bind:filter-query="filterQuery"
        v-bind:window-id="props.windowId"
        v-on:lock-file-tree="lockDirectoryTree()"
      ></FileList>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File manager Vue Component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the file manager logic.
 *
 * END HEADER
 */
import findObject from '@common/util/find-object'
import FileTree from './FileTree.vue'
import FileList from './FileList.vue'
import { trans } from '@common/i18n-renderer'
import { nextTick, ref, computed, watch, onMounted } from 'vue'
import { useConfigStore, useWorkspacesStore } from 'source/pinia'
import type { AnyDescriptor } from 'source/types/common/fsal'

const ipcRenderer = window.ipc

const props = defineProps<{ windowId: string }>()

const previous = ref<'file-list'|'directories'|undefined>(undefined) // Can be "file-list" or "directories"
const lockedTree = ref<boolean>(false)
const fileTreeVisible = ref<boolean>(true)
const fileListVisible = ref<boolean>(false)
const filterQuery = ref<string>('')

// Element refs
const arrowButton = ref<HTMLDivElement|null>(null)
const quickFilter = ref<HTMLInputElement|null>(null)
const rootElement = ref<HTMLDivElement|null>(null)
const fileTreeComponent = ref<typeof FileTree|null>(null)
const fileListComponent = ref<typeof FileList|null>(null)

const workspacesStore = useWorkspacesStore()
const configStore = useConfigStore()

const fileTree = computed<AnyDescriptor[]>(() => workspacesStore.roots.map(root => root.descriptor))
const selectedDirectory = computed(() => configStore.config.openDirectory)

const filterPlaceholder = trans('Filter…')
const fileManagerMode = computed(() => configStore.config.fileManagerMode)
const isThin = computed<boolean>(() => fileManagerMode.value === 'thin')
const isCombined = computed<boolean>(() => fileManagerMode.value === 'combined')
const isExpanded = computed<boolean>(() => fileManagerMode.value === 'expanded')

const isFileListVisible = computed<boolean>(() => isExpanded.value || fileListVisible.value)

watch(selectedDirectory, (value, _oldValue) => {
  // Reset the local search when a new directory has been selected
  filterQuery.value = ''
  // If the directory just got de-selected and the fileList
  // is visible, switch to the directories.
  if (value === null && isFileListVisible.value) {
    toggleFileList()
  } else if (!isFileListVisible.value) {
    // Otherwise make sure the fileList is visible (toggleFileList
    // will return if the mode is combined or expanded)
    toggleFileList()
  }
})

watch(fileManagerMode, () => {
  // Reset all properties from the resize operations.
  const fileTree = fileTreeComponent.value?.$el
  const fileList = fileListComponent.value?.$el
  fileTree.style.removeProperty('width')
  fileTree.style.removeProperty('left')
  fileList.style.removeProperty('width')
  fileList.style.removeProperty('left')
  fileTreeVisible.value = true
  fileListVisible.value = false
  // Then we want to do some additional
  // failsafes for the different modes
  if (isExpanded.value) {
    fileListVisible.value = true
  }

  // Enlargen the file manager, if applicable
  if (rootElement.value == null) {
    return
  }

  if (isExpanded.value && rootElement.value.offsetWidth < 100) {
    rootElement.value.style.width = '100px'
  }
})

onMounted(() => {
  ipcRenderer.on('shortcut', (event, message) => {
    if (message === 'filter-files') {
      // Focus the filter on the next tick. Why? Because it might be that
      // the file manager is hidden, or the global search is visible. In both
      // cases we need to wait for the app to display the file manager.
      nextTick()
        .then(() => { quickFilter.value?.focus() })
        .catch(err => console.error(err))
    }
  })
})

/**
 * Toggles the fileList's visibility, if applicable.
 */
function toggleFileList (): void {
  if (!isThin.value) {
    return // Do not toggle if we're not in thin mode.
  }

  if (lockedTree.value) {
    return // Don't toggle in case of a lockdown
  }

  // Switch back to directories in case of fileManagerMode changes
  if (!isThin.value && isFileListVisible.value) {
    fileTreeVisible.value = true
    fileListVisible.value = false
    arrowButton.value?.classList.add('hidden') // Hide the arrow button
    return
  }

  if (isFileListVisible.value) {
    // Display directories
    fileTreeVisible.value = true
    fileListVisible.value = false
    arrowButton.value?.classList.add('hidden') // Hide the arrow button
  } else {
    // Display the file list
    fileTreeVisible.value = false
    fileListVisible.value = true
  }
}

/**
 * Display the arrow button for navigation, if applicable.
 * @param {MouseEvent} evt The associated event.
 */
function maybeShowArrowButton (evt: MouseEvent): void {
  const canShowFileTree = isFileListVisible.value && isThin.value

  // Only show the button if the mouse is in the top of the file manager.
  // We're adding 10px padding to make sure we have some leeway in case of
  // sudden mouse movements.
  if (rootElement.value === null) {
    return
  }

  const { top, left, right } = rootElement.value.getBoundingClientRect()
  if (
    canShowFileTree &&
    evt.clientX >= left && evt.clientX <= right - 10 &&
    evt.clientY >= top + 10 && evt.clientY <= top + 200
  ) {
    arrowButton.value?.classList.remove('hidden')
  } else {
    arrowButton.value?.classList.add('hidden')
  }
}

function maybeNavigate (evt: KeyboardEvent): void {
  // If the file list is visible we can navigate
  if (isFileListVisible.value) {
    fileListComponent.value?.navigate(evt)
  } else {
    // Try to navigate the file tree
    fileTreeComponent.value?.navigate(evt)
  }
}

function handleQuickFilterBlur (_event: Event): void {
  // Stop navigating on blur
  if (isFileListVisible.value) {
    fileListComponent.value?.stopNavigate()
  } else {
    fileTreeComponent.value?.stopNavigate()
  }
}

/**
 * Scrolls the directory tree if necessary to enable dropping of
 * elements onto elements currently out of viewport.
 * @param {DragEvent} evt The associated event.
 */
function handleDragOver (evt: DragEvent): void {
  // We have to handle the dragging functionality manually, as all other
  // mouse and keyboard events are suppressed during a drag operation.
  // We need to scroll the tree container probably, and have to check it.
  let y = evt.clientY
  let elem = fileTreeComponent.value?.$el
  let scroll = elem.scrollTop
  let distanceBottom = elem.offsetHeight - y // The less the value, the closer
  let distanceTop = (scroll > 0) ? y - elem.offsetTop : 0
  if (elem.scrollHeight - scroll === elem.clientHeight) {
    distanceBottom = 0
  }

  // Now scroll if applicable. The calculations take care that
  // the scrolling is faster the closer to the edge the object
  // is
  if (distanceBottom > 0 && distanceBottom < 100) {
    elem.scrollTop += 10 - distanceBottom / 10
  }
  if (distanceTop > 0 && distanceTop < 100) {
    elem.scrollTop -= 10 - distanceTop / 10
  }
}

function handleWheel (event: WheelEvent): void {
  // Determine if we can scroll back & forth
  if (process.platform !== 'darwin') {
    return // macOS only
  }

  if (event.deltaY !== 0) {
    return // Don't interfere with vertical scrolling
  }

  // Toggle back and forth depending on the current state. toggleFileList
  // will make sure to catch things such as whether we are in combined mode
  if (event.deltaX > 0) {
    // Switch to the file list
    if (!isFileListVisible.value) {
      event.preventDefault()
      event.stopPropagation()
      toggleFileList()
    }
  } else if (event.deltaX < 0 && isFileListVisible.value) {
    // Switch to the tree view
    event.preventDefault()
    event.stopPropagation()
    toggleFileList()
  }
}

/**
 * Registers a click event on an item and toggles
 * the file list, if it's not visible.
 * @param {MouseEvent} evt The bubbled event.
 * TODO This function is a no-op right now
 */
function selectionListener (evt: MouseEvent): void {
  const target = evt.target as null|HTMLElement
  // No hash property? Nothing to do.
  if (target?.dataset.path === undefined) {
    return
  }

  const obj = findObject(fileTree.value, 'path', parseInt(target.dataset.path), 'children')
  // Nothing found/type is a file? Return.
  if (obj != null || obj.type === 'file') {
    return
  }

  if (!isFileListVisible.value) {
    toggleFileList()
  }
}

/**
 * Locks the directory tree (mostly in preparation for a drag operation)
 */
function lockDirectoryTree (): void {
  if (!isThin.value) {
    return // Don't lock the file tree if we aren't in a thin mode
  }

  // This function is called whenever the file list
  // should be hidden and only the file tree should
  // be visible
  if (isFileListVisible.value) {
    previous.value = 'file-list'
    toggleFileList()
  }

  lockedTree.value = true
}

/**
 * Unlocks the directory tree (mostly after a completed drag and drop operation)
 */
function unlockDirectoryTree (): void {
  if (!isThin.value) {
    return // Don't unlock the file tree if we aren't in a thin mode
  }

  lockedTree.value = false
  if (previous.value === 'file-list') {
    toggleFileList()
    previous.value = undefined
  }
}
</script>

<style lang="less">
body #file-manager {
  width: 100%;
  height: 100%;
  position: relative; // Necessary so that the arrow button isn't misplaced

  #component-container {
    overflow-x: hidden;
    // NOTE: Due to everything being relative, the component container is file-tree + file-list high
    overflow-y: hidden;
    position: relative;
    width: 100%;
    height: calc(100% - 37px); // 100% minus the filter
  }

  &.expanded {
    #file-tree, #file-list { width: 50%; }
    #file-list, #file-list.hidden { left: 50%; }
    #file-tree, #file-tree.hidden { left: 0%; }
  }

  // File manager arrow button
  #arrow-button {
    line-height: 25px;
    text-align: center;
    vertical-align: middle;
    background-color: white;
    border-radius: 100%;
    box-shadow: 1px 1px 10px 0px rgba(0, 0, 0, .25);
    z-index: 400;

    position: absolute;
    top: 50px;
    left: 10px;
    width: 30px;
    height: 30px;
    transition: 0.4s left ease;

    &.hidden { left:-60px; }
  }

  .file-manager-filter {
    padding: 5px;
    position: sticky;
    top: 0;
    z-index: 2;
    left: 0;
    right: 0;
    height: 37px;

    .file-manager-filter-input {
      border: 1px solid transparent;
      padding: 5px;
      width: 100%;
    }
  }
}

body.dark #file-manager {
  #arrow-button {
    background-color: rgb(80, 80, 80);
    color: rgb(230, 230, 230);
  }
}

body.darwin {
  #file-manager {
    border-top: 1px solid #d5d5d5;

    #component-container { height: calc(100% - 30px); }

    .file-manager-filter {
      background-color: transparent;
      height: 30px;
      padding: 4px;

      .file-manager-filter-input {
        background-color: rgb(255, 255, 255, 0.6);
        width: 100%;
        font-size: 11px;
        height: calc(30px - 9px);
      }
    }
  }

  &.dark {
    #file-manager {
      border-top-color: #505050;

      .file-manager-filter .file-manager-filter-input {
        background-color: rgb(100, 100, 100, 0.6);

        &::placeholder { color: rgb(150, 150, 150); }
      }
    }
  }
}

body.win32 {
  #file-manager {
    #component-container {
      height: calc(100% - 34px);
    }

    .file-manager-filter {
      padding: 0;
      border-bottom: 2px solid rgb(230, 230, 230);
      height: 32px; // The border should be *below* the 30px mark

      .file-manager-filter-input { height: 30px; }
    }
  }

  &.dark #file-manager {
    .file-manager-filter {
      border-bottom-color: rgb(40, 40, 50);
    }
  }
}
</style>
