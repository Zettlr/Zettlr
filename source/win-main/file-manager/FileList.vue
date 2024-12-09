<template>
  <div
    id="file-list"
    ref="rootElement"
    tabindex="1"
    role="region"
    aria-label="File List"
    v-bind:class="{ hidden: !isVisible }"
    v-bind:aria-hidden="!isVisible"
    v-on:blur="activeDescriptor = undefined"
  >
    <template v-if="getDirectoryContents.length > 1">
      <div v-if="getFilteredDirectoryContents.length === 0" class="empty-file-list">
        {{ noResultsMessage }}
      </div>
      <template v-else>
        <!--
        For the "real" file list, we need the virtual scroller to maintain
        performance, because it may contain thousands of elements.
        Provide the virtual scroller with the correct size of the list
        items (60px in mode with meta-data, 30 in cases without).
        NOTE: The page-mode MUST be true, because it will speed up
        performance incredibly!
        -->
        <RecycleScroller
          v-slot="{ item }"
          key-field="id"
          v-bind:items="getFilteredDirectoryContents"
          v-bind:item-size="itemHeight"
          v-bind:emit-update="true"
          v-bind:page-mode="true"
          v-on:update="updateDynamics"
        >
          <FileItem
            v-bind:obj="item.props"
            v-bind:active-file="activeDescriptor"
            v-bind:index="0"
            v-bind:window-id="windowId"
            v-on:create-file="handleOperation('file-new', item.id)"
            v-on:create-dir="handleOperation('dir-new', item.id)"
            v-on:begin-dragging="emit('lock-file-tree')"
          ></FileItem>
        </RecycleScroller>
      </template>
    </template>
    <template v-else-if="getDirectoryContents.length === 1">
      <!--
        We don't need the mock item here, because if any operation is started
        the actual directory contents will be larger than 1.
      -->
      <FileItem
        v-for="item in getDirectoryContents"
        v-bind:key="item.id"
        v-bind:index="0"
        v-bind:obj="item.props"
        v-bind:window-id="windowId"
        v-bind:active-file="activeDescriptor"
        v-on:create-file="handleOperation('file-new', item.id)"
        v-on:create-dir="handleOperation('dir-new', item.id)"
      >
      </FileItem>
      <div
        v-if="getDirectoryContents[0].props.type === 'directory'"
        class="empty-directory"
      >
        {{ emptyDirectoryMessage }}
      </div>
    </template>
    <template v-else>
      <!-- Same as above: Detect combined file manager mode -->
      <div class="empty-file-list">
        {{ emptyFileListMessage }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileList
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component renders the contents of a single directory as
 *                  a flat list.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import tippy from 'tippy.js'
import FileItem from './FileItem.vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import objectToArray from '@common/util/object-to-array'
import matchQuery from './util/match-query'

import { nextTick, ref, computed, watch, onUpdated } from 'vue'
import { useConfigStore, useDocumentTreeStore, useWorkspacesStore } from 'source/pinia'
import type { AnyDescriptor } from '@dts/common/fsal'
import { hasDataExt, hasImageExt, hasMSOfficeExt, hasOpenOfficeExt, hasPDFExt } from 'source/common/util/file-extention-checks'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

interface RecycleScrollerData {
  id: number
  props: AnyDescriptor
}

const ipcRenderer = window.ipc

const props = defineProps<{
  isVisible: boolean
  filterQuery: string
  windowId: string
}>()

const emit = defineEmits<(e: 'lock-file-tree') => void>()

const activeDescriptor = ref<AnyDescriptor|undefined>(undefined) // Can contain the active ("focused") item

const documentTreeStore = useDocumentTreeStore()
const workspacesStore = useWorkspacesStore()
const configStore = useConfigStore()

const selectedDirectory = computed(() => configStore.config.openDirectory)
const selectedDirDescriptor = computed(() => {
  if (selectedDirectory.value === null) {
    return undefined
  }

  return workspacesStore.getDir(selectedDirectory.value)
})

const noResultsMessage = trans('No results')
const emptyFileListMessage = trans('No directory selected')
const emptyDirectoryMessage = trans('Empty directory')
const selectedFile = computed(() => documentTreeStore.lastLeafActiveFile)
const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))
const itemHeight = computed(() => configStore.config.fileMeta ? 70 : 30)
const rootElement = ref<HTMLDivElement|null>(null)

const getDirectoryContents = computed<RecycleScrollerData[]>(() => {
  const dir = selectedDirDescriptor.value
  if (dir === undefined) {
    return []
  }

  const ret: RecycleScrollerData[] = []
  const items = objectToArray(dir, 'children') as AnyDescriptor[]
  const { files } = configStore.config
  for (let i = 0; i < items.length; i++) {
    if (items[i].type === 'other') {
      // Filter other files based on our settings. Why do these ugly nested if
      // constructs? To catch all the other "other" files in the else.
      if (hasImageExt(items[i].path)) {
        if (!files.images.showInFilemanager) {
          continue
        }
      } else if (hasPDFExt(items[i].path)) {
        if (!files.pdf.showInFilemanager) {
          continue
        }
      } else if (hasMSOfficeExt(items[i].path)) {
        if (!files.msoffice.showInFilemanager) {
          continue
        }
      } else if (hasOpenOfficeExt(items[i].path)) {
        if (!files.openOffice.showInFilemanager) {
          continue
        }
      } else if (hasDataExt(items[i].path)) {
        if (!files.dataFiles.showInFilemanager) {
          continue
        }
      } else {
        continue // Ignore any other "other" file
      }
    }

    ret.push({
      id: i, // This helps the virtual scroller to adequately position the items
      props: items[i] // The actual item
    })
  }
  return ret
})

// Add an additional layer of filtering: This function applies a potential
// project filtering to the files in this list to ensure that project files stay
// on top. This implements the same logic as `projectSortedFilteredChildren` in
// the `TreeItem.vue` component.
const getProjectOrderedDirectoryContents = computed(() => {
  const dir = selectedDirDescriptor.value
  if (dir === undefined || dir.type !== 'directory' || dir.settings.project === null) {
    return getDirectoryContents.value
  }

  // Modify the order using the project files by first mapping the sorted
  // project file paths onto the descriptors available, sorting all other files
  // separately, and then concatenating them with the project files up top.
  const projectFiles: RecycleScrollerData[] = dir.settings.project.files
    .map(filePath => getDirectoryContents.value.find(x => x.props.name === filePath))
    .filter(x => x !== undefined)

  const files: RecycleScrollerData[] = []
  for (const desc of getDirectoryContents.value) {
    if (!projectFiles.includes(desc)) {
      files.push(desc)
    }
  }

  // The file list displays the directory itself as its first element, so that
  // must be on top of even the project files.
  return [
    files[0],
    ...projectFiles,
    ...files.slice(1)
  ]
})

const getFilteredDirectoryContents = computed(() => {
  // Returns a list of directory contents, filtered
  const originalContents = getProjectOrderedDirectoryContents.value

  const q = props.filterQuery.trim().toLowerCase() // Easy access

  if (q === '') {
    return originalContents
  }

  const filter = matchQuery(q, useTitle.value, useH1.value)

  // Filter based on the query (remember: there's an ID and a "props" property)
  return originalContents.filter(element => {
    return filter(element.props)
  })
})

onUpdated(() => {
  nextTick()
    .then(updateDynamics)
    .catch(err => console.error(err))
})

watch(getFilteredDirectoryContents, () => {
  // Whenever the directory contents change, reset the active file if it's
  // no longer in the list
  const foundDescriptor = getFilteredDirectoryContents.value.find((elem) => {
    return elem.props === activeDescriptor.value
  })

  if (foundDescriptor === undefined) {
    activeDescriptor.value = undefined
  }
})

watch(selectedFile, () => {
  scrollIntoView()
  const foundDescriptor = getFilteredDirectoryContents.value.find((elem) => {
    return elem.props.path === selectedFile.value?.path
  })

  if (foundDescriptor === undefined) {
    activeDescriptor.value = undefined
  } else {
    activeDescriptor.value = foundDescriptor.props
  }
})

watch(getDirectoryContents, () => {
  nextTick()
    .then(() => { scrollIntoView() })
    .catch(err => console.error(err))
})

/**
 * Navigates the filelist to the next/prev file or directory.
 * Hold Shift for moving by 10 files, Command or Control to
 * jump to the very end.
 */
function navigate (evt: KeyboardEvent): void {
  // Only capture arrow movements
  if (![ 'ArrowDown', 'ArrowUp', 'Enter' ].includes(evt.key)) {
    return
  }

  evt.stopPropagation()
  evt.preventDefault()

  const shift = evt.shiftKey
  const cmd = evt.metaKey && process.platform === 'darwin'
  const ctrl = evt.ctrlKey && process.platform !== 'darwin'
  const cmdOrCtrl = cmd || ctrl

  // On pressing enter, that's the same as clicking
  if (evt.key === 'Enter' && activeDescriptor.value !== undefined) {
    if (activeDescriptor.value.type === 'directory') {
      configStore.setConfigValue('openDirectory', activeDescriptor.value.path)
    } else {
      // Select the active file (if there is one)
      ipcRenderer.invoke('documents-provider', {
        command: 'open-file',
        payload: {
          path: activeDescriptor.value.path,
          newTab: false
        }
      } as DocumentManagerIPCAPI)
        .catch(e => console.error(e))
    }
    return // Stop handling
  }

  const list = getFilteredDirectoryContents.value.map(e => e.props)
  const descriptor = list.find(e => {
    if (activeDescriptor.value !== undefined) {
      return e.path === activeDescriptor.value.path
    } else if (selectedFile.value !== undefined) {
      return e.path === selectedFile.value.path
    } else {
      return false
    }
  })

  switch (evt.key) {
    case 'ArrowDown': {
      let index = descriptor !== undefined ? list.indexOf(descriptor) : 0
      index++
      if (shift) {
        index += 9 // Fast-scrolling
      }
      if (index >= list.length) {
        index = list.length - 1
      }
      if (cmdOrCtrl) {
        // Select the last file
        activeDescriptor.value = list[list.length - 1]
      } else if (index < list.length) {
        activeDescriptor.value = list[index]
      }
      break
    }
    case 'ArrowUp': {
      let index = descriptor !== undefined ? list.indexOf(descriptor) : list.length
      index--
      if (shift) {
        index -= 9 // Fast-scrolling
      }
      if (index < 0) {
        index = 0
      }
      if (cmdOrCtrl) {
        // Select the first file
        activeDescriptor.value = list[0]
      } else if (index >= 0) {
        activeDescriptor.value = list[index]
      }
      break
    }
  }

  scrollIntoView()
}

function stopNavigate (): void {
  activeDescriptor.value = undefined
}

function scrollIntoView (): void {
  if (rootElement.value === null) {
    return
  }

  // In case the file changed, make sure it's in view.
  let scrollTop = rootElement.value.scrollTop
  const activeDescriptorOrFile = getFilteredDirectoryContents.value.find(e => {
    if (activeDescriptor.value !== undefined) {
      return e.props.path === activeDescriptor.value.path
    } else if (selectedFile.value !== undefined) {
      return e.props.path === selectedFile.value.path
    } else {
      return false
    }
  })

  if (activeDescriptorOrFile === undefined) {
    return
  }

  const index = getFilteredDirectoryContents.value.indexOf(activeDescriptorOrFile)

  let modifier = itemHeight.value
  let position = index * modifier
  const quickFilterModifier = 40 // Height of the quick filter

  if (position < scrollTop) {
    rootElement.value.scrollTop = position
  } else if (position > scrollTop + rootElement.value.offsetHeight - modifier) {
    rootElement.value.scrollTop = position - rootElement.value.offsetHeight + modifier + quickFilterModifier
  }
}

/**
 * Called everytime when there is an update to the DOM, so that we can
 * dynamically enable all newly rendered tippy instances.
 * @return {void}     Does not return.
 */
function updateDynamics (): void {
  if (rootElement.value === null) {
    return
  }

  // Tippy.js cannot observe changes within attributes, so because
  // the instances are all created in advance, we have to update
  // the content so that it reflects the current content of
  // the data-tippy-content-property.
  const elements = rootElement.value.querySelectorAll('[data-tippy-content]')
  for (const elem of elements) {
    if (!(elem instanceof HTMLElement)) {
      continue
    }

    // Either there's already an instance on the element,
    // then only update its contents ...
    if ('_tippy' in elem) {
      (elem._tippy as any).setContent(elem.dataset.tippyContent)
    } else {
      // ... or there is none, so let's add a tippy instance.
      tippy(elem, {
        delay: 100,
        arrow: true,
        duration: 100
      })
    }
  }
}

async function handleOperation (type: string, idx: number): Promise<void> {
  // Creates files and directories, or duplicates a file.
  const source = getDirectoryContents.value.find(item => item.id === idx)?.props
  if (source === undefined) {
    throw new Error('Could not handle file list operation: Source was undefined')
  }

  await ipcRenderer.invoke('application', {
    command: type,
    payload: { path: source.path }
  })
}

defineExpose({ navigate, stopNavigate })
</script>

<style lang="less">
// Import the necessary styles for the virtual scroller
@import '~vue-virtual-scroller/dist/vue-virtual-scroller.css';

body {
  #file-list {
    transition: left 0.3s ease;
    position: relative;
    width: 100%;
    top: -100%;
    left: 0%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    outline: none;

    &.hidden { left: 100%; }

    .empty-file-list, .empty-directory {
      display: block;
      text-align: center;
      padding: 10px;
      margin-top: 50%;
      font-weight: bold;
      font-size: 200%;
    }
  }
}

body.darwin {
  #file-list {
    background-color: white;
  }

  &.dark #file-list {
    background-color: rgb(40, 40, 50);
  }
}

body.win32 {
  #file-list {
    background-color: rgb(230, 230, 230);
  }

  &.dark {
    #file-list {
      background-color: rgb(40, 40, 50);
    }
  }
}
</style>
