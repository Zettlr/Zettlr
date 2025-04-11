<template>
  <div role="tabpanel">
    <!-- Table of Contents -->
    <h1>{{ titleOrTocLabel }}</h1>
    <!-- Show the ToC entries -->
    <div
      v-for="(entry, idx) of tableOfContents"
      v-bind:key="idx"
      v-bind:data-line="entry.line"
      v-bind:class="'toc-entry-container toc-heading-' + entry.level"
      draggable="true"
      v-on:click="emit('jump-to-line', entry.line)"
      v-on:dragstart="startDragging"
      v-on:dragover="dragOver"
      v-on:drop="drop"
    >
      <div class="toc-level">
        {{ entry.renderedLevel }}
      </div>
      <div
        v-bind:class="{ 'toc-entry': true, 'toc-entry-active': tocEntryIsActive(entry.line, idx) }"
        v-bind:data-line="entry.line"
        v-html="toc2html(entry.text)"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { trans } from '@common/i18n-renderer'
import { ref, computed, watch } from 'vue'
import sanitizeHtml from 'sanitize-html'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { type AnyDescriptor } from '@dts/common/fsal'
import { md2html } from '@common/modules/markdown-utils'
import { useConfigStore, useDocumentTreeStore, useWindowStateStore } from 'source/pinia'

const ipcRenderer = window.ipc
const windowStateStore = useWindowStateStore()
const documentTreeStore = useDocumentTreeStore()
const configStore = useConfigStore()

const emit = defineEmits<{
  (e: 'move-section', data: { from: number, to: number }): void
  (e: 'jump-to-line', line: number): void
}>()

const activeFileDescriptor = ref<AnyDescriptor|null>(null)
const library = ref<string>(CITEPROC_MAIN_DB)

const tableOfContents = computed(() => windowStateStore.tableOfContents)
/**
 * Returns either the title property for the active file or the generic ToC
 * label -- to be used within the ToC of the sidebar
 *
 * @return  {string}  The title for the ToC sidebar
 */
const titleOrTocLabel = computed(() => {
  if (
    activeFileDescriptor.value === null ||
    activeFileDescriptor.value.type !== 'file' ||
    activeFileDescriptor.value.frontmatter == null
  ) {
    return trans('Table of contents')
  }

  const frontmatter = activeFileDescriptor.value.frontmatter

  if ('title' in frontmatter && frontmatter.title.length > 0) {
    return frontmatter.title
  } else {
    return trans('Table of contents')
  }
})

const activeFile = computed(() => documentTreeStore.lastLeafActiveFile)

watch(activeFile, async (newValue) => {
  if (newValue === undefined) {
    activeFileDescriptor.value = null
  } else {
    const descriptor: AnyDescriptor|undefined = await ipcRenderer.invoke('application', {
      command: 'get-descriptor',
      payload: newValue.path
    })

    activeFileDescriptor.value = descriptor ?? null
  }
})

watch(activeFileDescriptor, (newValue) => {
  if (newValue === null || newValue.type !== 'file') {
    library.value = CITEPROC_MAIN_DB
  } else {
    const fm = newValue.frontmatter
    if (fm != null && 'bibliography' in fm && typeof fm.bibliography === 'string' && fm.bibliography.length > 0) {
      library.value = fm.bibliography
    }
  }
})

/**
 * Whether the cursor is within the corresponding document section
 *
 * @param   {number}  tocEntryLine          Line number of section heading
 * @param   {number}  tocEntryIdx           Index of heading in ToC
 */
function tocEntryIsActive (tocEntryLine: number, tocEntryIdx: number): boolean {
  if (tableOfContents.value === undefined || windowStateStore.activeDocumentInfo === undefined) {
    return false
  }

  const cursorLine = windowStateStore.activeDocumentInfo.cursor.line

  // Determine index of next heading in ToC list
  const nextTocEntryIdx = Math.min(tocEntryIdx + 1, tableOfContents.value.length - 1)

  // Now, determine the next heading's line number
  let nextTocEntryLine = Infinity
  if (tocEntryIdx !== nextTocEntryIdx) {
    nextTocEntryLine = tableOfContents.value[nextTocEntryIdx].line
  }

  // True, when cursor lies between current and next heading
  return (cursorLine >= tocEntryLine && cursorLine < nextTocEntryLine)
}

/**
 * Converts a Table of Contents-entry to (safe) HTML
 *
 * @param   {string}  entryText  The Markdown ToC entry
 *
 * @return  {string}             The safe HTML string
 */
function toc2html (entryText: string): string {
  const html = md2html(entryText, window.getCitationCallback(library.value), configStore.config.zkn.linkFormat)
  return sanitizeHtml(html, {
    // Headings may be emphasised and contain code
    allowedTags: [ 'em', 'kbd', 'code' ]
  })
}

function startDragging (event: DragEvent): void {
  if (event.currentTarget === null) {
    return
  }
  const fromLine = (event.currentTarget as HTMLElement).dataset.line
  if (fromLine !== undefined) {
    event.dataTransfer?.setData('x-zettlr/toc-drag', fromLine)
  }
}

function dragOver (event: DragEvent): void {
  const elem = document.querySelectorAll('.toc-entry-container')
  elem.forEach(e => e.classList.remove('toc-drop-effect'))
  const container = event.currentTarget as HTMLElement
  container.classList.add('toc-drop-effect')
}

function drop (event: DragEvent): void {
  if (event.currentTarget === null || event.dataTransfer === null) {
    return
  }

  const container = event.currentTarget as HTMLElement
  container.classList.remove('toc-drop-effect')

  if (container.dataset.line === undefined) {
    return
  }

  const fromLine = parseInt(event.dataTransfer.getData('x-zettlr/toc-drag'), 10)
  const toLine = parseInt(container.dataset.line, 10)
  if (fromLine === toLine) {
    return
  }

  const actualToLine = findEndOfEntry(toLine)
  if (actualToLine === undefined) {
    console.warn('Could not move section: Could not find correct target line')
    return
  }

  emit('move-section', { from: fromLine, to: actualToLine })
}

function findEndOfEntry (originalToLine: number): number|undefined {
  if (tableOfContents.value == null) {
    return
  }

  const idx = tableOfContents.value.findIndex(elem => elem.line === originalToLine)

  if (idx < 0) {
    return
  }

  if (idx === tableOfContents.value.length - 1) {
    return -1
  } else {
    return tableOfContents.value[idx + 1].line - 1
  }
}
</script>

<style lang="less">
// Add a neat little effect to the table of content entries as you drag them
.toc-entry-container {
  border-bottom: 2px solid transparent;

  &.toc-heading-1 { margin-left: 0px; }
  &.toc-heading-2 { margin-left: 10px; }
  &.toc-heading-3 { margin-left: 20px; }
  &.toc-heading-4 { margin-left: 30px; }
  &.toc-heading-5 { margin-left: 40px; }
  &.toc-heading-6 { margin-left: 50px; }

  &.toc-drop-effect {
    border-bottom-color: rgb(40, 100, 255);
  }
}
</style>
