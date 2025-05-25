<template>
  <SplitView
    v-bind:initial-size-percent="[ 20, 80 ]"
    v-bind:minimum-size-percent="[ 20, 20 ]"
    v-bind:reset-size-percent="[ 20, 80 ]"
    v-bind:split="'horizontal'"
    v-bind:initial-total-width="100"
  >
    <template #view1>
      <SelectableList
        v-bind:items="listItems"
        v-bind:editable="true"
        v-bind:selected-item="currentItem"
        v-on:select="currentItem = $event"
        v-on:add="newDefaultsFile()"
        v-on:remove="removeFile($event)"
      ></SelectableList>
    </template>
    <template #view2>
      <div id="defaults-container">
        <p>{{ defaultsExplanation }}</p>

        <p>
          <TextControl
            v-model="currentFilename"
            v-bind:inline="false"
            v-bind:disabled="currentItem < 0"
            v-on:confirm="renameFile()"
          ></TextControl>
          <ButtonControl
            v-bind:label="renameFileLabel"
            v-bind:inline="true"
            v-bind:disabled="visibleItems.length === 0 || currentFilename === visibleItems[currentItem].name"
            v-on:click="renameFile()"
          ></ButtonControl>
        </p>

        <ButtonControl
          v-bind:label="openDefaultsFolderLabel"
          v-bind:inline="false"
          v-on:click="openDefaultsDirectory"
        ></ButtonControl>

        <ZtrAdmonition v-if="visibleItems.length > 0 && visibleItems[currentItem].isProtected === true" type="info">
          {{ protectedProfileWarning }}
        </ZtrAdmonition>

        <ZtrAdmonition v-if="visibleItems[currentItem]?.isInvalid">
          {{ invalidProfileWarning }}
        </ZtrAdmonition>

        <CodeEditor
          ref="code-editor"
          v-model="editorContents"
          v-bind:mode="'yaml'"
        ></CodeEditor>

        <!-- This div is used to keep the buttons in a line despite the flex -->
        <div>
          <ButtonControl
            v-bind:primary="true"
            v-bind:label="saveButtonLabel"
            v-bind:inline="true"
            v-on:click="saveDefaultsFile()"
          ></ButtonControl>
          <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
        </div>
      </div>
    </template>
  </SplitView>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Defaults
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the defaults file editor view. It allows users to
 *                  modify the provided defaults files.
 *
 * END HEADER
 */

import SplitView from '@common/vue/window/SplitView.vue'
import SelectableList, { type SelectableListItem } from '@common/vue/form/elements/SelectableList.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import CodeEditor from '@common/vue/CodeEditor.vue'
import ZtrAdmonition from '@common/vue/ZtrAdmonition.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed, toRef, watch, onUnmounted } from 'vue'
import type { AssetsProviderIPCAPI, PandocProfileMetadata } from '@providers/assets'
import { PANDOC_READERS, PANDOC_WRITERS, SUPPORTED_READERS } from '@common/pandoc-util/pandoc-maps'
import sanitizeFilename from 'sanitize-filename'
import { DateTime } from 'luxon'
import { parseReaderWriter } from 'source/common/pandoc-util/parse-reader-writer'

const ipcRenderer = window.ipc

const NEW_DEFAULTS_FILE_CONTENTS = `# This is a new defaults file that you can use to define rules for exporting or
# importing files to and from Zettlr. The only two required properties are the
# writer and reader ones. Without them, Zettlr will not be able to export or
# import your files. You can choose any reader or writer that is supported by
# Pandoc. Zettlr will automatically show the profile at appropriate locations
# based on the values of the writer and reader properties.
# More info: https://pandoc.org/MANUAL.html.
reader: markdown
writer: markdown
`
const props = defineProps<{
  // "which" describes which kind of defaults files this instance controls
  // can be "import" (for any --> Markdown) or "export" (for Markdown --> any)
  which: 'import'|'export'
}>()

const currentItem = ref(0)
const currentFilename = ref('')
const editorContents = ref('')
const lastLoadedEditorContents = ref('')
const savingStatus = ref('')
const availableDefaultsFiles = ref<PandocProfileMetadata[]>([])

const protectedProfileWarning = trans('This profile is protected. This means that it will be restored when you remove or rename it.')
const invalidProfileWarning = trans('This profile is invalid. It may contain errors, or it may be missing the writer or reader property.')
const renameFileLabel = trans('Rename file')
const openDefaultsFolderLabel = trans('Open defaults folder')
const defaultsExplanation = trans('Edit the default settings for imports or exports here.')
const saveButtonLabel = trans('Save')

// <PandocProfileMetadata[]>
const visibleItems = computed(() => {
  // Display either the exporting or importing formats depending on the tab
  return availableDefaultsFiles.value
    .filter((e) => {
      if (e.isInvalid) {
        return true // We always need to show invalid files so users can fix them
      }
      // Retrieve which one we need to check
      const readerWriter = (props.which === 'import') ? e.writer : e.reader
      const parsedReaderWriter = parseReaderWriter(readerWriter)
      return SUPPORTED_READERS.includes(parsedReaderWriter.name)
    })
})

const listItems = computed<SelectableListItem[]>(() => {
  return visibleItems.value
    .map(file => {
      // Try to resolve known and fully supported extensions
      const parsedReader = parseReaderWriter(file.reader)
      const parsedWriter = parseReaderWriter(file.writer)
      const reader = parsedReader.name in PANDOC_READERS ? PANDOC_READERS[parsedReader.name] : parsedReader.name
      const writer = parsedWriter.name in PANDOC_WRITERS ? PANDOC_WRITERS[parsedWriter.name] : parsedWriter.name
      const infoString = (file.isInvalid) ? 'Invalid' : [ reader, writer ].join(' → ')

      return {
        displayText: file.name.substring(0, file.name.lastIndexOf('.')),
        icon: file.isProtected === true ? 'lock' : undefined,
        solidIcon: true,
        infoString,
        infoStringClass: file.isInvalid ? 'error' : undefined
      }
    })
})

watch(toRef(props, 'which'), function () {
  // Reset to the beginning of the list. The watcher right below will pick
  // that change up and re-load the defaults.
  currentItem.value = -1
  loadDefaultsForState().catch(e => console.error(e))
})

watch(currentItem, () => {
  loadDefaultsForState().catch(e => console.error(e))
})

watch(editorContents, () => {
  if (editorContents.value === lastLoadedEditorContents.value) {
    savingStatus.value = ''
  } else {
    savingStatus.value = trans('Unsaved changes')
  }
})

retrieveDefaultsFiles()
  .then(() => {
    loadDefaultsForState().catch(e => console.error(e))
  })
  .catch(e => console.error(e))

const offCallback = ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'save-file') {
    saveDefaultsFile()
  }
})
onUnmounted(() => { offCallback() })

async function loadDefaultsForState (): Promise<void> {
  // Loads a defaults file from main for the given state (tab + list item)
  if (availableDefaultsFiles.value.length === 0) {
    currentFilename.value = ''
    return
  }

  if (visibleItems.value.length === 0) {
    return
  }

  if (currentItem.value < 0) {
    currentItem.value = 0
  }

  if (currentItem.value >= visibleItems.value.length) {
    currentItem.value = visibleItems.value.length - 1
  }

  const name = visibleItems.value[currentItem.value].name

  const data = await ipcRenderer.invoke('assets-provider', {
    command: 'get-defaults-file',
    payload: { filename: name }
  } as AssetsProviderIPCAPI)

  lastLoadedEditorContents.value = data
  editorContents.value = data
  currentFilename.value = visibleItems.value[currentItem.value].name
  savingStatus.value = ''
}

async function retrieveDefaultsFiles (): Promise<void> {
  // NOTE: Here we are explicitly requesting only the defaults files, not
  // all export profiles, because here it's only about modifying them (which
  // does not work with the custom profiles the exporter provides).
  ipcRenderer.invoke('assets-provider', {
    command: 'list-defaults'
  } as AssetsProviderIPCAPI)
    .then((files: PandocProfileMetadata[]) => {
      availableDefaultsFiles.value = files
      if (currentItem.value < 0) {
        currentItem.value = 0
      }
      loadDefaultsForState().catch(e => console.error(e))
    })
    .catch(err => console.error(err))
}

function saveDefaultsFile (): void {
  savingStatus.value = trans('Saving …')

  const name = visibleItems.value[currentItem.value].name

  ipcRenderer.invoke('assets-provider', {
    command: 'set-defaults-file',
    payload: { filename: name, contents: editorContents.value }
  } as AssetsProviderIPCAPI)
    .then(async () => {
      lastLoadedEditorContents.value = editorContents.value
      savingStatus.value = trans('Saved!')
      await retrieveDefaultsFiles() // Always make sure to pull in any changes
      setTimeout(() => { savingStatus.value = '' }, 1000)
    })
    .catch(err => console.error(err))
}

function newDefaultsFile (): void {
  // Create a new defaults file
  const dt = DateTime.now()
  const timeString = dt.toISOTime({
    includeOffset: false,
    suppressMilliseconds: true
  })

  const newName = `New Profile ${dt.toISODate()} ${timeString}.yaml`
  ipcRenderer.invoke('assets-provider', {
    command: 'set-defaults-file',
    payload: { filename: newName, contents: NEW_DEFAULTS_FILE_CONTENTS }
  } as AssetsProviderIPCAPI)
    .then(async () => {
      await retrieveDefaultsFiles() // Always make sure to pull in any changes
    })
    .catch(err => console.error(err))
}

function renameFile (): void {
  let newName = currentFilename.value
  if (!newName.endsWith('.yaml') && !newName.endsWith('.yml')) {
    newName += '.yaml'
  }

  newName = sanitizeFilename(newName, { replacement: '-' })

  const oldName = visibleItems.value[currentItem.value].name

  ipcRenderer.invoke('assets-provider', {
    command: 'rename-defaults-file',
    payload: { oldName, newName }
  } as AssetsProviderIPCAPI)
    .then(async () => {
      await retrieveDefaultsFiles() // Always make sure to pull in any changes
    })
    .catch(err => console.error(err))
}

function removeFile (idx: number): void {
  if (idx > visibleItems.value.length - 1 || idx < 0) {
    return
  }

  const filename = visibleItems.value[idx].name

  ipcRenderer.invoke('assets-provider', {
    command: 'remove-defaults-file',
    payload: { filename }
  } as AssetsProviderIPCAPI)
    .then(async () => {
      await retrieveDefaultsFiles() // Always make sure to pull in any changes
    })
    .catch(err => console.error(err))
}

function openDefaultsDirectory (): void {
  ipcRenderer.invoke('assets-provider', {
    command: 'open-defaults-directory'
  } as AssetsProviderIPCAPI).catch(err => console.error(err))
}
</script>

<style lang="less">
#defaults-container {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .CodeMirror {
    flex-grow: 1;
  }

  span.protected-info {
    color: gray;
  }
}
</style>
