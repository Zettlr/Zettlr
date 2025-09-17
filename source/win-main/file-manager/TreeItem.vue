<template>
  <div class="tree-item-container">
    <div
      v-bind:class="{
        'tree-item': true,
        [obj.type]: true,
        'selected': isSelected,
        'active': activeItem === obj.path,
        'project': obj.type === 'directory' && obj.settings.project != null,
        'root': isRoot
      }"
      v-bind:data-id="obj.type === 'file' ? obj.id : ''"
      v-bind:data-path="obj.path"
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
        v-bind:aria-label="`Select ${obj.name}`"
        v-bind:draggable="!isRoot"
        v-bind:title="obj.path"
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
            v-bind:value="obj.name"
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
        v-if="operationType !== undefined"
        ref="newObjectInput"
        type="text"
        v-on:keyup.enter="handleOperationFinish(($event.target as HTMLInputElement).value)"
        v-on:keyup.esc="operationType = undefined"
        v-on:keydown.stop=""
        v-on:blur="operationType = undefined"
        v-on:click.stop=""
      >
    </div>
    <div v-if="isDirectory && !shouldBeCollapsed">
      <TreeItem
        v-for="child in projectSortedFilteredChildren"
        v-bind:key="child.path"
        v-bind:obj="child"
        v-bind:has-duplicate-name="false"
        v-bind:is-currently-filtering="isCurrentlyFiltering"
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
    v-if="showPopover && displayText !== null && obj.type === 'directory'"
    v-bind:target="displayText"
    v-bind:directory="obj"
    v-on:close="showPopover = false"
  ></PopoverDirProps>
  <PopoverFileProps
    v-if="showPopover && displayText !== null && obj.type !== 'directory'"
    v-bind:target="displayText"
    v-bind:file="obj"
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
import { useConfigStore, useWindowStateStore } from 'source/pinia'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import { useItemComposable } from './util/item-composable'
import { hasDataExt, hasImageExt, hasMSOfficeExt, hasOpenOfficeExt, hasPDFExt } from 'source/common/util/file-extention-checks'

const ipcRenderer = window.ipc

const emit = defineEmits<(e: 'toggle-file-list') => void>()

const props = defineProps<{
  // How deep is this tree item nested?
  depth: number
  hasDuplicateName: boolean
  obj: AnyDescriptor
  isCurrentlyFiltering: boolean
  activeItem?: string
  windowId: string
}>()

// const collapsed = ref<boolean>(true) // Initial: collapsed list (if there are children)
const collapsed = computed(() => !windowStateStore.uncollapsedDirectories.includes(props.obj.path))
const canAcceptDraggable = ref<boolean>(false) // Helper var set to true while something hovers over this element
const uncollapseTimeout = ref<undefined|ReturnType<typeof setTimeout>>(undefined) // Used to uncollapse directories during drag&drop ops
const nameEditingInput = ref<HTMLInputElement|null>(null)
const displayText = ref<HTMLDivElement|null>(null)
const newObjectInput = ref<HTMLInputElement|null>(null)

const configStore = useConfigStore()
const windowStateStore = useWindowStateStore()

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
} = useItemComposable(props.obj, displayText, props.windowId, nameEditingInput)

function sel (event: MouseEvent): void {
  requestSelection(event)
  // We have one problem: We can't emit events from within the composable, so we
  // have to wrap this function for one specific instance: When the user clicks
  // again on the already selected directory, the file manager must toggle to
  // the file list. This doesn't work by implication because the configuration
  // doesn't update if oldValue === newValue.
  if (selectedDir.value === props.obj.path) {
    emit('toggle-file-list')
  }
}

const shouldBeCollapsed = computed<boolean>(() => props.isCurrentlyFiltering ? false : collapsed.value)

/**
 * The secondary icon's shape -- this is the visually FIRST icon to be
 * displayed. Displays either an angle (for directories with children), or
 * nothing.
 *
 * @return  {string|boolean}  False if no secondary icon
 */
const secondaryIcon = computed(() => hasChildren.value ? 'angle' : false)

/**
 * The primary icon's shape -- this is the visually SECOND icon to be
 * displayed. Returns an icon appropriate to the item we are representing.
 *
 * @return  {string}  The icon name (as in: cds-shape)
 */
const primaryIcon = computed(() => {
  if (props.obj.type === 'file' && writingTarget.value !== undefined) {
    return 'writing-target'
  } else if (props.obj.type === 'file') {
    return 'markdown'
  } else if (props.obj.type === 'code') {
    return 'code'
  } else if (props.obj.type === 'other') {
    // const fileExtIcon = ClarityIcons.registry['file-ext'].outline!
    if (hasImageExt(props.obj.path)) {
      return 'image'
    } else if (hasPDFExt(props.obj.path)) {
      return 'pdf-file'
    } else if (hasMSOfficeExt(props.obj.path)) {
      return 'file' // fileExtIcon.replace('EXT', props.obj.ext.slice(1, 4))
    } else if (hasOpenOfficeExt(props.obj.path)) {
      return 'file' // fileExtIcon.replace('EXT', props.obj.ext.slice(1, 4))
    } else if (hasDataExt(props.obj.path)) {
      return 'file' // fileExtIcon.replace('EXT', props.obj.ext.slice(1, 4))
    } else {
      // Generic other file (this should not happen as they get filtered out before)
      console.warn(`Encountered a file with extension ${props.obj.ext}. These should've been filtered out before reaching this point!`)
      return ''
    }
  } else if (props.obj.type === 'directory' && props.obj.dirNotFoundFlag === true) {
    return 'disconnect'
  } else if (props.obj.type === 'directory' && props.obj.settings.project !== null) {
    // Indicate that this directory has a project.
    return 'blocks-group'
  } else if (props.obj.type === 'directory' && props.obj.settings.icon != null) {
    // Display the custom icon
    return props.obj.settings.icon
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
const angleDirection = computed(() => {
  if (!hasChildren.value) {
    return undefined
  } else {
    return shouldBeCollapsed.value ? 'right' : 'down'
  }
})

const writingTarget = computed<undefined|{ path: string, mode: 'words'|'chars', count: number }>(() => {
  if (props.obj.type !== 'file') {
    return undefined
  } else {
    return windowStateStore.writingTargets.find((x: any) => x.path === props.obj.path)
  }
})

const writingTargetPercent = computed(() => {
  if (writingTarget.value !== undefined && props.obj.type === 'file') {
    const count = writingTarget.value.mode === 'words'
      ? props.obj.wordCount
      : props.obj.charCount

    let ratio = count / writingTarget.value.count
    return Math.min(1, ratio)
  } else {
    return 0.0
  }
})

/**
 * Returns true if this item is a root item
 */
const isRoot = computed(() => props.obj.root)

/**
 * Returns true if the file manager mode is set to "combined"
 */
const combined = computed(() => configStore.config.fileManagerMode === 'combined')

/**
 * Returns true if there are children that can be displayed
 *
 * @return {boolean} Whether or not this object has children.
 */
const hasChildren = computed(() => props.obj.type === 'directory' && filteredChildren.value.length > 0)

/**
 * Returns the (containing) directory name.
 */
const dirname = computed(() => pathBasename(props.obj.dir))

/**
 * Returns a list of children that can be displayed inside the tree view
 */
const filteredChildren = computed(() => {
  if (props.obj.type !== 'directory') {
    return []
  }

  if (combined.value) {
    return props.obj.children.filter(child => {
      if (child.type === 'other') {
        const { files } = configStore.config
        // Filter other files based on our settings
        if (hasImageExt(child.path)) {
          return files.images.showInFilemanager
        } else if (hasPDFExt(child.path)) {
          return files.pdf.showInFilemanager
        } else if (hasMSOfficeExt(child.path)) {
          return files.msoffice.showInFilemanager
        } else if (hasOpenOfficeExt(child.path)) {
          return files.openOffice.showInFilemanager
        } else if (hasDataExt(child.path)) {
          return files.dataFiles.showInFilemanager
        } else {
          return false // Any other "other" file should be excluded
        }
      }

      return true
    })
  } else {
    return props.obj.children.filter(child => child.type === 'directory')
  }
})

/**
 * Returns a list of children that can be displayed inside the tree view, sorted
 * by project inclusion status.
 */
const projectSortedFilteredChildren = computed(() => {
  if (props.obj.type !== 'directory' || props.obj.settings.project === null) {
    return filteredChildren.value
  }

  // Modify the order using the project files by first mapping the sorted
  // project file paths onto the descriptors available, sorting all other files
  // separately, and then concatenating them with the project files up top.
  const projectFiles = props.obj.settings.project.files
    .map(filePath => filteredChildren.value.find(x => x.name === filePath))
    .filter(x => x !== undefined)

  const files: AnyDescriptor[] = []
  for (const desc of filteredChildren.value) {
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
  if (props.obj.type !== 'file') {
    return props.obj.name
  }

  if (useTitle.value && props.obj.yamlTitle !== undefined) {
    return props.obj.yamlTitle
  } else if (useH1.value && props.obj.firstHeading !== null) {
    return props.obj.firstHeading
  } else if (displayMdExtensions.value) {
    return props.obj.name
  } else {
    return props.obj.name.replace(props.obj.ext, '')
  }
})

const isSelected = computed(() => {
  if (props.obj.type === 'directory') {
    return selectedDir.value === props.obj.path
  } else {
    return selectedFile.value?.path === props.obj.path
  }
})

watch(selectedFile, uncollapseIfApplicable)
watch(selectedDir, uncollapseIfApplicable)

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
watch(toRef(props, 'obj'), function (value) {
  updateObject(value)
})

onMounted(() => {
  uncollapseIfApplicable()
  ipcRenderer.on('shortcut', (_, message) => {
    if (message === 'new-dir') {
      operationType.value = 'createDir'
    }
  })
})

function uncollapseIfApplicable (): void {
  if (!collapsed.value) {
    return // We are already open, no need to do anything.
  }

  const filePath = selectedFile.value?.path ?? ''
  const dirPath = selectedDir.value ?? ''

  // Open the tree, if the selected file is contained in this dir somewhere
  if (filePath.startsWith(props.obj.path)) {
    windowStateStore.uncollapsedDirectories.push(props.obj.path)
  } else {
    // we are not in the filepath of the currently open note, do not change the state!
    return
  }

  // If a directory within this has been selected, open up, lads!
  if (props.obj.path.startsWith(dirPath)) {
    windowStateStore.uncollapsedDirectories.push(props.obj.path)
  }
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
    type: props.obj.type,
    path: props.obj.path,
    id: (props.obj.type === 'file') ? props.obj.id : ''
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
    windowStateStore.uncollapsedDirectories.push(props.obj.path)
    uncollapseTimeout.value = undefined
  }, 2000)
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
  if (data.path === props.obj.path) {
    return
  }

  // Finally, request the move!
  ipcRenderer.invoke('application', {
    command: 'request-move',
    payload: {
      from: data.path,
      to: props.obj.path
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
        path: props.obj.path,
        name: newName.trim()
      }
    }).catch(e => console.error(e))
  } else if (operationType.value === 'createDir' && newName.trim() !== '') {
    ipcRenderer.invoke('application', {
      command: 'dir-new',
      payload: {
        path: props.obj.path,
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
  if (!hasChildren.value) {
    return
  }

  if (collapsed.value) {
    windowStateStore.uncollapsedDirectories.push(props.obj.path)
  } else {
    const idx = windowStateStore.uncollapsedDirectories.indexOf(props.obj.path)
    if (idx > -1) {
      windowStateStore.uncollapsedDirectories.splice(idx, 1)
    }
  }
}
</script>

<style lang="less">
body {
  div.tree-item-container {
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
        font-size: 13px;
        padding: 3px 5px;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 8px;

        // These inputs should be more or less "invisible"
        input {
          border: none;
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          background-color: transparent;
          padding: 0;
        }
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
