<template>
  <div class="tree-item-container">
    <div
      v-bind:class="{
        'tree-item': true,
        [item.type]: true,
        'selected': isSelected,
        'active': activeItem === item.path,
        'project': item.type === 'directory' && item.settings.project != null,
        'root': isRoot
      }"
      v-bind:data-id="item.type === 'file' ? item.id : ''"
      v-bind:data-path="item.path"
      v-bind:style="{
        'padding-left': `${depth * 15 + 10}px`
      }"
      v-on:click.stop="sel"
      v-on:auxclick.stop="sel"
      v-on:contextmenu="handleContextMenu"
      v-on:dragover="acceptDrags"
      v-on:dragenter="enterDragging"
      v-on:dragleave="leaveDragging"
      v-on:drop="handleDrop"
    >
      <!-- First: Secondary icon (if its a directory and it has children) -->
      <span
        class="item-icon"
        aria-hidden="true"
        v-on:click.stop="maybeUncollapse"
        v-on:auxclick.stop.prevent="maybeUncollapse"
      >
        <cds-icon
          v-if="secondaryIcon !== false"
          v-bind:shape="secondaryIcon"
          role="presentation"
          v-bind:direction="angleDirection"
          v-bind:class="{
            'is-solid': typeof secondaryIcon !== 'boolean' && [ 'disconnect', 'blocks-group' ].includes(secondaryIcon),
            'special': typeof secondaryIcon !== 'boolean'
          }"
        />
      </span>
      <!-- Second: Primary icon (The folder, file, or custom icon) -->
      <span class="toggle-icon" aria-hidden="true">
        <!-- If the customIcon is set to 'writing-target' we need to display our
        custom progress ring, instead of a regular icon -->
        <RingProgress
          v-if="primaryIcon === 'writing-target'"
          v-bind:ratio="writingTargetPercent"
        ></RingProgress>
        <!-- Otherwise, display whatever the secondary Icon is -->
        <cds-icon
          v-else
          v-bind:shape="primaryIcon"
          role="presentation"
          v-bind:class="{
            'special': typeof primaryIcon !== 'boolean' && ![ 'right', 'down' ].includes(primaryIcon)
          }"
          v-bind:solid="typeof primaryIcon !== 'boolean' && [ 'disconnect', 'blocks-group' ].includes(primaryIcon)"
        ></cds-icon>
      </span>
      <span
        ref="displayText"
        v-bind:class="{
          'display-text': true,
          'highlight': canAcceptDraggable
        }"
        role="button"
        v-bind:aria-label="`Select ${item.name}`"
        v-bind:draggable="!isRoot"
        v-bind:title="item.path"
        v-on:dragstart="beginDragging"
        v-on:drag="onDragHandler"
      >
        <template v-if="!nameEditing">
          {{ basename }}
        </template>
        <template v-else>
          <input
            ref="nameEditingInput"
            type="text"
            class="filename-input"
            v-bind:placeholder="filenameInputPlaceholder"
            v-bind:value="item.name"
            v-on:keyup.enter="finishNameEditing(($event.target as HTMLInputElement).value)"
            v-on:keyup.esc="nameEditing = false"
            v-on:keydown.stop=""
            v-on:blur="nameEditing = false"
            v-on:click.stop=""
          >
        </template>
        <span
          v-if="hasDuplicateName"
          class="dir"
        >
          &nbsp;({{ dirname }})
        </span>
      </span>
    </div>
    <div
      v-if="operationType !== undefined"
      v-bind:style="{
        'padding-left': `${(depth + 2) * 15 + 10}px`
      }"
    >
      <input
        ref="newObjectInput"
        class="filename-input"
        type="text"
        v-bind:placeholder="filenameInputPlaceholder"
        v-on:keyup.enter="handleOperationFinish(($event.target as HTMLInputElement).value)"
        v-on:keyup.esc="operationType = undefined"
        v-on:keydown.stop=""
        v-on:blur="operationType = undefined"
        v-on:click.stop=""
      >
    </div>
    <div v-if="item.type === 'directory' && !shouldBeCollapsed">
      <TreeItem
        v-for="child in projectSortedFilteredChildren"
        v-bind:key="child.path"
        v-bind:item="child"
        v-bind:has-duplicate-name="false"
        v-bind:filter-results="props.filterResults"
        v-bind:depth="depth + 1"
        v-bind:active-item="activeItem"
        v-bind:window-id="windowId"
        v-on:toggle-file-list="emit('toggle-file-list')"
      >
      </TreeItem>
    </div>
  </div>

  <!-- Popovers -->
  <PopoverDirProps
    v-if="showPopover && displayText !== null && item.type === 'directory'"
    v-bind:target="displayText"
    v-bind:directory="item"
    v-bind:children="children"
    v-on:close="showPopover = false"
  ></PopoverDirProps>
  <PopoverFileProps
    v-if="showPopover && displayText !== null && item.type !== 'directory'"
    v-bind:target="displayText"
    v-bind:file="item"
    v-on:close="showPopover = false"
  ></PopoverFileProps>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TreeItem Vue Component
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single sub-tree in the file manager.
 *
 * END HEADER
 */

import generateFilename from '@common/util/generate-filename'
import { trans } from '@common/i18n-renderer'
import PopoverDirProps from './util/PopoverDirProps.vue'
import PopoverFileProps from './util/PopoverFileProps.vue'

import RingProgress from '@common/vue/window/toolbar-controls/RingProgress.vue'
import { nextTick, ref, computed, watch, onMounted, toRef } from 'vue'
import type { AnyDescriptor } from '@dts/common/fsal'
import { useConfigStore, useWindowStateStore, useWorkspaceStore } from 'source/pinia'
import { pathBasename, relativePath } from '@common/util/renderer-path-polyfill'
import { useItemComposable } from './util/item-composable'
import {
  hasDataExt,
  hasImageExt,
  hasMSOfficeExt,
  hasOpenOfficeExt,
  hasPDFExt,
  hasExt,
  hasMdOrCodeExt
} from 'source/common/util/file-extention-checks'
import { isDotFile } from 'source/common/util/ignore-path'
import type { FSALEventPayload, FSALEventPayloadChange } from 'source/app/service-providers/fsal'
import { getSorter } from 'source/common/util/directory-sorter'
import type { WritingTarget } from 'source/app/service-providers/targets'

const ipcRenderer = window.ipc

const emit = defineEmits<(e: 'toggle-file-list') => void>()

const props = defineProps<{
  // How deep is this tree item nested?
  depth: number
  hasDuplicateName: boolean
  item: AnyDescriptor
  filterResults: string[]
  activeItem?: string
  windowId: string
}>()

// const collapsed = ref<boolean>(true) // Initial: collapsed list (if there are children)
const collapsed = computed(() => !windowStateStore.uncollapsedDirectories.includes(props.item.path))
const canAcceptDraggable = ref<boolean>(false) // Helper var set to true while something hovers over this element
const uncollapseTimeout = ref<undefined|ReturnType<typeof setTimeout>>(undefined) // Used to uncollapse directories during drag&drop ops
const nameEditingInput = ref<HTMLInputElement|null>(null)
const displayText = ref<HTMLDivElement|null>(null)
const newObjectInput = ref<HTMLInputElement|null>(null)

const children = ref<AnyDescriptor[]>([])

const configStore = useConfigStore()
const windowStateStore = useWindowStateStore()
const workspaceStore = useWorkspaceStore()

const {
  nameEditing,
  showPopover,
  operationType,
  onDragHandler,
  handleContextMenu,
  requestSelection,
  finishNameEditing,
  isDirectory,
  selectedFile,
  selectedDir,
  updateObject
} = useItemComposable(props.item, displayText, props.windowId, nameEditingInput)

const filenameInputPlaceholder = trans('Enter a name')

function sel (event: MouseEvent): void {
  requestSelection(event)
  // We have one problem: We can't emit events from within the composable, so we
  // have to wrap this function for one specific instance: When the user clicks
  // again on the already selected directory, the file manager must toggle to
  // the file list. This doesn't work by implication because the configuration
  // doesn't update if oldValue === newValue.
  if (selectedDir.value === props.item.path) {
    emit('toggle-file-list')
  }
}

const shouldBeCollapsed = computed<boolean>(() => props.filterResults.length === 0 && collapsed.value)

const showDotFiles = ref<boolean>(configStore.config.files.dotFiles.showInFilemanager)
configStore.$subscribe((_mutation, state) => {
  showDotFiles.value = state.config.files.dotFiles.showInFilemanager
})

/**
 * The secondary icon's shape -- this is the visually FIRST icon to be
 * displayed. Displays either an angle (for directories with children), or
 * nothing.
 *
 * @return  {string|boolean}  False if no secondary icon
 */
const secondaryIcon = computed(() => filteredChildren.value.length > 0 ? 'angle' : false)

/**
 * The primary icon's shape -- this is the visually SECOND icon to be
 * displayed. Returns an icon appropriate to the item we are representing.
 *
 * @return  {string}  The icon name (as in: cds-shape)
 */
const primaryIcon = computed(() => {
  const { files, attachmentExtensions } = configStore.config

  if (props.item.type === 'file' && writingTarget.value !== undefined) {
    return 'writing-target'
  } else if (props.item.type === 'file') {
    return 'markdown'
  } else if (props.item.type === 'code') {
    return 'code'
  } else if (props.item.type === 'other') {
    if (hasImageExt(props.item.path)) {
      return 'image'
    } else if (hasPDFExt(props.item.path)) {
      return 'pdf-file'
    } else if (hasMSOfficeExt(props.item.path)) {
      return 'file'
    } else if (hasOpenOfficeExt(props.item.path)) {
      return 'file'
    } else if (hasDataExt(props.item.path)) {
      return 'code'
    } else if (hasExt(props.item.path, attachmentExtensions)) {
      return 'file-group'
    } else {
      // Generic other file (this should not happen as they get filtered out before)
      if (!files.dotFiles.showInFilemanager) {
        console.warn(`Encountered a file with extension ${props.item.ext}. These should've been filtered out before reaching this point!`)
      }
      return 'unknown-status'
    }
  } else if (props.item.type === 'directory' && props.item.dirNotFoundFlag === true) {
    return 'disconnect'
  } else if (props.item.type === 'directory' && props.item.settings.project !== null) {
    // Indicate that this directory has a project.
    return 'blocks-group'
  } else if (props.item.type === 'directory' && props.item.settings.icon != null) {
    // Display the custom icon
    return props.item.settings.icon
  } else {
    return shouldBeCollapsed.value ? 'folder' : 'folder-open'
  }
})

/**
 * The direction of the folder's angle icon: Right if collapsed, down if
 * uncollapsed. Can be undefined.
 *
 * @return  {string}  Either 'right' or 'down'
 */
const angleDirection = computed(() => shouldBeCollapsed.value ? 'right' : 'down')

const writingTarget = computed<undefined|{ path: string, mode: 'words'|'chars', count: number }>(() => {
  if (props.item.type !== 'file') {
    return undefined
  } else {
    return windowStateStore.writingTargets.find((x: WritingTarget) => x.path === props.item.path)
  }
})

const writingTargetPercent = computed(() => {
  if (writingTarget.value !== undefined && props.item.type === 'file') {
    const count = writingTarget.value.mode === 'words'
      ? props.item.wordCount
      : props.item.charCount

    let ratio = count / writingTarget.value.count
    return Math.min(1, ratio)
  } else {
    return 0.0
  }
})

/**
 * Returns true if this item is a root item
 */
const isRoot = computed(() => workspaceStore.rootDescriptors.find(rd => rd.path === props.item.path) !== undefined)

/**
 * Returns true if the file manager mode is set to "combined"
 */
const combined = computed(() => configStore.config.fileManagerMode === 'combined')

/**
 * Returns the (containing) directory name.
 */
const dirname = computed(() => pathBasename(props.item.dir))

/**
 * Returns a list of children that can be displayed inside the tree view
 */
const filteredChildren = computed(() => {
  if (props.item.type !== 'directory') {
    return []
  }

  const { files, attachmentExtensions } = configStore.config

  return children.value
    // Ensure we only consider filtered files
    .filter(child => {
      if (props.filterResults.length === 0) {
        return true
      }

      return props.filterResults.some(res => res.startsWith(child.path))
    })
    // Filter based on our rules
    .filter(child => {
      if (!combined.value) {
        return child.type === 'directory' && (files.dotFiles.showInFilemanager || !isDotFile(child.name))
      }

      // Filter files based on our settings
      if (child.type === 'directory') {
        return files.dotFiles.showInFilemanager || !isDotFile(child.name)
      }

      // We have to check for hidden files first so they are not
      // included if they end in one of the accepted extensions
      if (isDotFile(child.name)) {
        return files.dotFiles.showInFilemanager
      } else if (hasImageExt(child.path)) {
        return files.images.showInFilemanager
      } else if (hasPDFExt(child.path)) {
        return files.pdf.showInFilemanager
      } else if (hasMSOfficeExt(child.path)) {
        return files.msoffice.showInFilemanager
      } else if (hasOpenOfficeExt(child.path)) {
        return files.openOffice.showInFilemanager
      } else if (hasDataExt(child.path)) {
        return files.dataFiles.showInFilemanager
      } else if (hasMdOrCodeExt(child.path)) {
        return true
      } else {
        return hasExt(child.path, attachmentExtensions) // Any other "other" file should be excluded
      }
    })
})

const sortedChildren = computed(() => {
  if (props.item.type !== 'directory') {
    return []
  }

  const { sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime } = configStore.config

  const sorter = getSorter(
    sorting,
    sortFoldersFirst,
    fileNameDisplay,
    appLang,
    fileMetaTime
  )

  return sorter(filteredChildren.value, props.item.settings.sorting)
})

/**
 * Returns a list of children that can be displayed inside the tree view, sorted
 * by project inclusion status.
 */
const projectSortedFilteredChildren = computed(() => {
  if (props.item.type !== 'directory' || props.item.settings.project === null) {
    return sortedChildren.value
  }

  // Modify the order using the project files by first mapping the sorted
  // project file paths onto the descriptors available, sorting all other files
  // separately, and then concatenating them with the project files up top.
  const projectFiles = props.item.settings.project.files
    .map(filePath => sortedChildren.value.find(x => x.name === filePath))
    .filter(x => x !== undefined)

  const files: AnyDescriptor[] = []
  for (const desc of sortedChildren.value) {
    if (!projectFiles.includes(desc)) {
      files.push(desc)
    }
  }

  return projectFiles.concat(files)
})

const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))
const displayMdExtensions = computed(() => configStore.config.display.markdownFileExtensions)

const basename = computed(() => {
  if (props.item.type !== 'file') {
    return props.item.name
  }

  if (useTitle.value && props.item.yamlTitle !== undefined) {
    return props.item.yamlTitle
  } else if (useH1.value && props.item.firstHeading !== null) {
    return props.item.firstHeading
  } else if (displayMdExtensions.value) {
    return props.item.name
  } else {
    return props.item.name.replace(props.item.ext, '')
  }
})

const isSelected = computed(() => {
  if (props.item.type === 'directory') {
    return selectedDir.value === props.item.path
  } else {
    return selectedFile.value?.path === props.item.path
  }
})

watch(operationType, (newVal) => {
  if (newVal !== undefined) {
    nextTick().then(() => {
      if (newObjectInput.value === null) {
        return
      }

      if (operationType.value === 'createFile') {
        // If we're generating a file, generate a filename
        const filenamePattern = configStore.config.newFileNamePattern
        const idGenPattern = configStore.config.zkn.idGen
        newObjectInput.value.value = generateFilename(filenamePattern, idGenPattern)
      } else if (operationType.value === 'createDir') {
        // Else standard val for new dirs.
        newObjectInput.value.value = trans('Untitled')
      }
      newObjectInput.value.focus()
      // Select from the beginning until the last dot
      newObjectInput.value.setSelectionRange(0, newObjectInput.value.value.lastIndexOf('.'))
    })
      .catch(err => console.error(err))
  }
})

// I have no idea why passing this as a Ref to the composable doesn't work, but
// this way it does.
watch(toRef(props, 'item'), function (value) {
  updateObject(value)
})

watch(showDotFiles, async function () {
  if (props.item.type === 'directory') {
    await fetchChildren()
  }
})

onMounted(async () => {
  if (props.item.type === 'directory') {
    ipcRenderer.on('shortcut', (_, message) => {
      if (message === 'new-dir') {
        operationType.value = 'createDir'
      }
    })

    await fetchChildren()
  }

  ipcRenderer.on('fsal-event', (_, payload: FSALEventPayload) => {
    const affectedPath = payload.event === 'unlink' || payload.event === 'unlinkDir'
      ? payload.path
      : (payload as FSALEventPayloadChange).descriptor.path

    // Figure out if this event relates to us, which is only the case if the
    // affected path is a direct descendant of this tree item. If it's itself or
    // a parent path, another tree item takes over. If it's a nested dependent,
    // any of the children of this tree item takes over.
    // How can we figure this out? Easy, by resolving the path from this item
    // to the affected path and checking if there are any additional path
    // separators in there.
    if (!affectedPath.startsWith(props.item.path)) {
      return
    }

    if (affectedPath === props.item.path) {
      return // Taken care of by the parent
    }

    const relative = relativePath(props.item.path, affectedPath)
    const PATH_SEP = process.platform === 'win32' ? '\\' : '/'
    if (relative.includes(PATH_SEP)) {
      return
    }

    // Now we can be sure that the event pertains to a direct child of this item
    // and we need to handle it. We'll make it easy and simply re-fetch the list
    // of children.
    fetchChildren().catch(err => console.error(`[TreeItem] Could not fetch children for item "${props.item.path}": ${err.message}`, err))
  })
})

async function fetchChildren (): Promise<void> {
  children.value = await ipcRenderer.invoke('fsal', { command: 'read-directory', payload: props.item.path })
}

/**
 * Initiates a drag movement and inserts the correct data
 * @param {DragEvent} event The drag event
 */
function beginDragging (event: DragEvent): void {
  if (event.dataTransfer === null) {
    return
  }

  event.dataTransfer.dropEffect = 'move'
  event.dataTransfer.setData('text/x-zettlr-file', JSON.stringify({
    type: props.item.type,
    path: props.item.path,
    id: (props.item.type === 'file') ? props.item.id : ''
  }))
}

/**
 * Called when a drag operation enters this item; adds a highlight class
 */
function enterDragging (_event: DragEvent): void {
  if (!isDirectory.value) {
    return
  }

  canAcceptDraggable.value = true

  if (!collapsed.value) {
    return
  }

  uncollapseTimeout.value = setTimeout(() => {
    windowStateStore.uncollapsedDirectories.push(props.item.path)
    uncollapseTimeout.value = undefined
  }, 1000)
}

/**
 * The oppossite of enterDragging; removes the highlight class
 */
function leaveDragging (_event: DragEvent): void {
  if (!isDirectory.value) {
    return
  }

  canAcceptDraggable.value = false

  if (uncollapseTimeout.value !== undefined) {
    clearTimeout(uncollapseTimeout.value)
    uncollapseTimeout.value = undefined
  }
}

/**
 * Called whenever something is dropped onto the element.
 * Only executes if it's a valid tree-item/file-list object.
 */
function handleDrop (event: DragEvent): void {
  canAcceptDraggable.value = false
  event.preventDefault()

  if (!isDirectory.value) {
    return
  }

  if (uncollapseTimeout.value !== undefined) {
    clearTimeout(uncollapseTimeout.value)
    uncollapseTimeout.value = undefined
  }

  if (event.dataTransfer === null) {
    return
  }

  // Now we have to be careful. The user can now ALSO
  // drag and drop files right onto the list. So we need
  // to make sure it's really an element from in here and
  // NOT a file, because these need to be handled by the
  // app itself.
  let data

  try {
    const eventData = event.dataTransfer.getData('text/x-zettlr-file')
    data = JSON.parse(eventData) // Throws error if eventData === ''
  } catch (err) {
    // Error in JSON stringifying (either b/c malformed or no text)
    return
  }

  // The user dropped the file onto itself
  if (data.path === props.item.path) {
    return
  }

  // Finally, request the move!
  ipcRenderer.invoke('application', {
    command: 'request-move',
    payload: {
      from: data.path,
      to: props.item.path
    }
  })
    .catch(err => console.error(err))
}

/**
 * Makes sure the browser doesn't do unexpected stuff when dragging, e.g., external files.
 * @param {DragEvent} event The drag event
 */
function acceptDrags (event: DragEvent): void {
  // We need to constantly preventDefault to ensure
  // that, e.g., a Python or other script file doesn't
  // override the location.href to display.
  event.preventDefault()
}

function handleOperationFinish (newName: string): void {
  if (operationType.value === 'createFile' && newName.trim() !== '') {
    ipcRenderer.invoke('application', {
      command: 'file-new',
      payload: {
        path: props.item.path,
        name: newName.trim()
      }
    }).catch(e => console.error(e))
  } else if (operationType.value === 'createDir' && newName.trim() !== '') {
    ipcRenderer.invoke('application', {
      command: 'dir-new',
      payload: {
        path: props.item.path,
        name: newName.trim()
      }
    }).catch(e => console.error(e))
  }

  operationType.value = undefined
}

/**
 * Helper function to toggle the collapsed status on a directory item with children
 */
function maybeUncollapse (): void {
  if (filteredChildren.value.length === 0) {
    return
  }

  if (collapsed.value) {
    windowStateStore.uncollapsedDirectories.push(props.item.path)
  } else {
    const idx = windowStateStore.uncollapsedDirectories.indexOf(props.item.path)
    if (idx > -1) {
      windowStateStore.uncollapsedDirectories.splice(idx, 1)
    }
  }
}
</script>

<style lang="less">
body {
  div.tree-item-container {
    font-size: 13px;

    // These inputs should be more or less "invisible"
    input.filename-input {
      border: none;
      color: inherit;
      font-family: inherit;
      font-size: inherit;
      background-color: transparent;
      width: auto;
      field-sizing: content;
      padding: 0;
    }

    .tree-item {
      white-space: nowrap;
      display: flex;
      margin: 8px 0px;

      .item-icon, .toggle-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        flex-shrink: 0; // Prevent shrinking; only the display text should
      }

      .display-text {
        padding: 3px 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 8px;

      }

      &.project {
        color: rgb(220, 45, 45);
      }

      &.selected .display-text {
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, --c-primary-contrast);
      }

      &.active .display-text {
        background-color: rgb(68, 68, 68);
        color: rgb(255, 255, 255);
      }
    }
  }

  &.dark div.tree-item-container {
    .tree-item {
      &.project {
        color: rgb(240, 98, 98);
      }

      &.active .display-text {
        background-color: rgb(68, 68, 68);
        color: rgb(255, 255, 255);
      }
    }
  }
}

body.darwin {
  .tree-item {
    color: rgb(53, 53, 53);

    // On macOS, non-standard icons are normally displayed in color
    clr-icon.special { color: var(--system-accent-color, --c-primary); }

    .display-text {
      border-radius: 4px;

      &.highlight {
        outline-width: 2px;
        outline-color: var(--system-accent-color, --c-primary);
        outline-style: solid;
      }
    }

    &.selected .display-text {
      background-image: linear-gradient(#00000000, #00000022);
    }
  }

  &.dark {
    .tree-item {
      color: rgb(240, 240, 240);
    }
  }
}

body.win32 {
  .tree-item {

    .display-text {
      &.highlight {
        // This class is applied on drag & drop
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, --c-primary-contrast);
      }
    }
  }
}

body.linux {
  .tree-item {

    .display-text {
      &.highlight {
        // This class is applied on drag & drop
        background-color: var(--system-accent-color, --c-primary);
        color: var(--system-accent-color-contrast, --c-primary-contrast);
      }
    }
  }
}
</style>
