<template>
  <div
    ref="paneElement"
    v-bind:class="{
      'editor-pane': true,
      'distraction-free': distractionFree
    }"
    v-bind:style="elementStyles"
    v-on:dragenter="handleDragEnter($event, 'editor')"
    v-on:dragleave="handleDragLeave($event)"
  >
    <!-- We have a leaf: Default DocumentTabs/Editor combo -->
    <DocumentTabs
      v-show="!distractionFree"
      v-bind:leaf-id="leafId"
      v-bind:window-id="windowId"
    ></DocumentTabs>
    <div
      class="editor-container"
      v-on:drop="handleDrop($event, 'editor')"
    >
      <template v-for="file in openFiles" v-bind:key="file.path">
        <!--
          Teleport the correct editor that needs to be in distraction free
          outside the DOM structure to have it render on top of everything else.
        -->
        <Teleport to="div#window-content" v-bind:disabled="!distractionFree || activeFile?.path !== file.path">
          <MainEditor
            v-show="activeFile?.path === file.path"
            v-bind:file="file"
            v-bind:distraction-free="distractionFree && activeFile?.path === file.path"
            v-bind:leaf-id="leafId"
            v-bind:active-file="activeFile"
            v-bind:window-id="windowId"
            v-bind:editor-commands="editorCommands"
            v-on:global-search="emit('globalSearch', $event)"
          ></MainEditor>
        </Teleport>
      </template>

      <!-- Show empty pane if there are no files -->
      <div v-if="hasNoOpenFiles" class="empty-pane"></div>

      <!-- Implement dropzones for editor pane splitting -->
      <div
        v-if="documentTabDrag"
        v-bind:class="{
          dropzone: true,
          top: true,
          dragover: documentTabDragWhere === 'top'
        }"
        v-on:drop="handleDrop($event, 'top')"
        v-on:dragenter="handleDragEnter($event, 'top')"
        v-on:dragleave="handleDragLeave($event)"
      >
        <cds-icon v-if="documentTabDragWhere === 'top'" shape="angle" direction="up"></cds-icon>
      </div>
      <div
        v-if="documentTabDrag"
        v-bind:class="{
          dropzone: true,
          left: true,
          dragover: documentTabDragWhere === 'left'
        }"
        v-on:drop="handleDrop($event, 'left')"
        v-on:dragenter="handleDragEnter($event, 'left')"
        v-on:dragleave="handleDragLeave($event)"
      >
        <cds-icon v-if="documentTabDragWhere === 'left'" shape="angle" direction="left"></cds-icon>
      </div>
      <div
        v-if="documentTabDrag"
        v-bind:class="{
          dropzone: true,
          bottom: true,
          dragover: documentTabDragWhere === 'bottom'
        }"
        v-on:drop="handleDrop($event, 'bottom')"
        v-on:dragenter="handleDragEnter($event, 'bottom')"
        v-on:dragleave="handleDragLeave($event)"
      >
        <cds-icon v-if="documentTabDragWhere === 'bottom'" shape="angle" direction="down"></cds-icon>
      </div>
      <div
        v-if="documentTabDrag"
        v-bind:class="{
          dropzone: true,
          right: true,
          dragover: documentTabDragWhere === 'right'
        }"
        v-on:drop="handleDrop($event, 'right')"
        v-on:dragenter="handleDragEnter($event, 'right')"
        v-on:dragleave="handleDragLeave($event)"
      >
        <cds-icon v-if="documentTabDragWhere === 'right'" shape="angle" direction="right"></cds-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type LeafNodeJSON, type OpenDocument } from '@dts/common/documents'
import { type EditorCommands } from './App.vue'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import DocumentTabs from './DocumentTabs.vue'
import MainEditor from './MainEditor.vue'
import { useDocumentTreeStore, useWindowStateStore } from 'source/pinia'

const ipcRenderer = window.ipc

const windowStateStore = useWindowStateStore()
const documentTreeStore = useDocumentTreeStore()

const props = defineProps<{
  leafId: string
  windowId: string
  availableWidth?: number
  availableHeight?: number
  editorCommands: EditorCommands
}>()

type DragTargetAreas = 'editor'|'top'|'left'|'right'|'bottom'

const emit = defineEmits<(e: 'globalSearch', query: string) => void>()

const documentTabDrag = ref<boolean>(false)
const documentTabDragWhere = ref<DragTargetAreas|undefined>(undefined)

const elementStyles = computed<string>(() => {
  if (distractionFree.value) {
    return ''
  } else {
    return `width: ${props.availableWidth ?? 100}%; height: ${props.availableHeight ?? 100}%`
  }
})

const paneElement = ref<HTMLDivElement|null>(null)
const distractionFree = computed<boolean>(() => windowStateStore.distractionFreeMode === props.leafId)
const node = computed<LeafNodeJSON|undefined>(() => documentTreeStore.paneData.find((leaf: LeafNodeJSON) => leaf.id === props.leafId))
const activeFile = computed<OpenDocument|null>(() => node.value?.activeFile ?? null)
const openFiles = computed<OpenDocument[]>(() => node.value?.openFiles ?? [])
const hasNoOpenFiles = computed<boolean>(() => openFiles.value.length === 0)

onMounted(() => {
  // Global drag end listener to ensure the split-view indicators always disappear
  document.addEventListener('dragend', finishDrag, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('dragend', finishDrag)
})

function handleDrop (event: DragEvent, where: 'editor'|'top'|'left'|'right'|'bottom'): boolean|undefined {
  const DELIM = (process.platform === 'win32') ? ';' : ':'
  const documentTab = event.dataTransfer?.getData('zettlr/document-tab')
  if (documentTab?.includes(DELIM) === true) {
    documentTabDrag.value = false
    event.stopPropagation()
    event.preventDefault()
    // At this point, we have received a drop we need to handle it. There
    // are two possibilities: Either the user has dropped the file onto the
    // editor, which means the file should be moved from its origin here.
    // Or, the user has dropped the file onto one of the four edges. In that
    // case, we need to first split this specific leaf, and then move the
    // dropped file there. The drag data contains both the origin and the
    // path, separated by the $PATH delimiter -> window:leaf:absPath
    const [ originWindow, originLeaf, ...filePath ] = documentTab.split(DELIM)
    if (where === 'editor' && props.leafId === originLeaf) {
      // Nothing to do, the user dropped the file on the origin
      return false
    }

    // Now actually perform the act
    if (where === 'editor') {
      ipcRenderer.invoke('documents-provider', {
        command: 'move-file',
        payload: {
          originWindow,
          targetWindow: props.windowId,
          originLeaf,
          targetLeaf: props.leafId,
          path: filePath.join(DELIM)
        }
      })
        .catch(err => console.error(err))
    } else {
      const dir = ([ 'left', 'right' ].includes(where)) ? 'horizontal' : 'vertical'
      const ins = ([ 'top', 'left' ].includes(where)) ? 'before' : 'after'
      ipcRenderer.invoke('documents-provider', {
        command: 'split-leaf',
        payload: {
          originWindow: props.windowId,
          originLeaf: props.leafId,
          direction: dir,
          insertion: ins,
          path: filePath.join(DELIM),
          fromWindow: originWindow,
          fromLeaf: originLeaf
        }
      })
        .catch(err => console.error(err))
    }
  }
}

function handleDragEnter (event: DragEvent, where: 'editor'|'top'|'left'|'right'|'bottom'): void {
  const hasDocumentTab = event.dataTransfer?.types.includes('zettlr/document-tab') ?? false
  if (hasDocumentTab) {
    event.stopPropagation()
    documentTabDrag.value = true
    documentTabDragWhere.value = where
  }
}

function handleDragLeave (event: DragEvent): void {
  if (paneElement.value === null) {
    return
  }

  const bounds = paneElement.value.getBoundingClientRect()
  const outX = event.clientX < bounds.left || event.clientX > bounds.right
  const outY = event.clientY < bounds.top || event.clientY > bounds.bottom
  if (outX || outY) {
    finishDrag()
  }
}

function finishDrag (): void {
  documentTabDrag.value = false
  documentTabDragWhere.value = undefined
}
</script>

<style lang="less">

@dropzone-size: 60px;

@keyframes caretup {
  from { margin-bottom: 0; opacity: 1; }
  50% { opacity: 0; }
  75% { margin-bottom: @dropzone-size; opacity: 0; }
  to { margin-bottom: @dropzone-size; opacity: 0; }
}
@keyframes caretdown {
  from { margin-top: 0; opacity: 1; }
  50% { opacity: 0; }
  75% { margin-top: @dropzone-size; opacity: 0; }
  to { margin-top: @dropzone-size; opacity: 0; }
}
@keyframes caretleft {
  from { margin-right: 0; opacity: 1; }
  50% { opacity: 0; }
  75% { margin-right: @dropzone-size; opacity: 0; }
  to { margin-right: @dropzone-size; opacity: 0; }
}
@keyframes caretright {
  from { margin-left: 0; opacity: 1; }
  50% { opacity: 0; }
  75% { margin-left: @dropzone-size; opacity: 0; }
  to { margin-left: @dropzone-size; opacity: 0; }
}

body {
  .editor-pane {
    // Styles for the editor pane
    height: 100%;
    display: flex;
    flex-direction: column;

    .editor-container {
      position: relative;
      overflow: auto;
      flex-grow: 1;

      div.dropzone {
        position: absolute;
        background-color: rgba(0, 0, 0, 0);
        transition: all 0.3s ease;
        // Display the direction caret centered ...
        display: flex;
        align-items: center;
        // ... and in white (against the dragover background color)
        color: white;

        cds-icon { margin: 0; }

        &.dragover {
          background-color: rgba(21, 61, 107, 0.5);
          box-shadow: 0px 0px 5px 0px rgba(0, 0, 0, .2);
          backdrop-filter: blur(2px);
        }

        &.top {
          top: 0;
          width: 100%;
          height: @dropzone-size;
          flex-direction: column-reverse;
          cds-icon { animation: 1s ease-out infinite running caretup; }
        }

        &.left {
          top: 0;
          left: 0;
          height: 100%;
          width: @dropzone-size;
          flex-direction: row-reverse;
          cds-icon { animation: 1s ease-out infinite running caretleft; }
        }

        &.right {
          top: 0;
          right: 0;
          height: 100%;
          width: @dropzone-size;
          flex-direction: row;
          cds-icon { animation: 1s ease-out infinite running caretright; }
        }

        &.bottom {
          bottom: 0;
          width: 100%;
          height: @dropzone-size;
          justify-content: center;
          align-items: flex-start;
          cds-icon { animation: 1s ease-out infinite running caretdown; }
        }
      }

      .empty-pane {
        width: 100%;
        height: 100%;
        // If the editor is empty, display a nice background image
        background-position: center center;
        background-size: contain;
        background-repeat: no-repeat;
        background-image: url(../common/img/logo.svg);
        background-color: white;
        padding-top: 5em;
      }
    }
  }

  &.dark .editor-pane .editor-container .empty-pane {
    background-color: rgb(40, 40, 40);
  }
}
</style>
