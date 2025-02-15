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
        v-bind:items="availableSnippets"
        v-bind:selected-item="currentItem"
        v-bind:editable="true"
        v-on:select="currentItem = $event"
        v-on:add="addSnippet()"
        v-on:remove="removeSnippet($event)"
      ></SelectableList>
    </template>
    <template #view2>
      <div id="snippets-container">
        <p>{{ snippetsExplanation }}</p>

        <p>
          <TextControl
            v-model="currentSnippetText"
            v-bind:inline="true"
            v-bind:disabled="currentItem < 0"
            v-on:confirm="renameSnippet()"
          ></TextControl>
          <ButtonControl
            v-bind:label="renameSnippetLabel"
            v-bind:inline="true"
            v-bind:disabled="availableSnippets.length === 0 || currentSnippetText === availableSnippets[currentItem]"
            v-on:click="renameSnippet()"
          ></ButtonControl>
        </p>

        <ButtonControl
          v-bind:label="openSnippetsFolderLabel"
          v-bind:inline="false"
          v-on:click="openSnippetsDirectory"
        ></ButtonControl>

        <CodeEditor
          ref="code-editor"
          v-model="editorContents"
          v-bind:mode="'markdown-snippets'"
          v-bind:readonly="currentItem < 0"
        ></CodeEditor>

        <ButtonControl
          v-bind:primary="true"
          v-bind:label="saveButtonLabel"
          v-bind:inline="true"
          v-bind:disabled="currentItem < 0 || ($refs['code-editor'] as any).isClean()"
          v-on:click="saveSnippet()"
        ></ButtonControl>
        <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
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
import SelectableList from '@common/vue/form/elements/SelectableList.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import CodeEditor from '@common/vue/CodeEditor.vue'
import { trans } from '@common/i18n-renderer'
import { ref, watch, onUnmounted } from 'vue'
import type { AssetsProviderIPCAPI } from 'source/app/service-providers/assets'

const ipcRenderer = window.ipc

const saveButtonLabel = trans('Save')
const renameSnippetLabel = trans('Rename snippet')
const snippetsExplanation = trans('Snippets let you define reusable pieces of text with variables.')
const openSnippetsFolderLabel = trans('Open snippets folder')

const currentItem = ref(-1)
const currentSnippetText = ref('')
const editorContents = ref('')
const savingStatus = ref('')
const availableSnippets = ref<string[]>([])

watch(currentItem, () => {
  loadState()
})

watch(editorContents, () => {
  if (CodeEditor.value?.isClean() === true) {
    savingStatus.value = ''
  } else {
    savingStatus.value = trans('Unsaved changes')
  }
})

// Immediately update the available snippets
updateAvailableSnippets()

const offCallback = ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'save-file') {
    saveSnippet()
  }
})

onUnmounted(() => { offCallback() })

function updateAvailableSnippets (selectAfterUpdate?: string): void {
  ipcRenderer.invoke('assets-provider', { command: 'list-snippets' } as AssetsProviderIPCAPI)
    .then(data => {
      availableSnippets.value = data
      if (typeof selectAfterUpdate === 'string' && availableSnippets.value.includes(selectAfterUpdate)) {
        currentItem.value = availableSnippets.value.indexOf(selectAfterUpdate)
      }
      loadState()
    })
    .catch(err => console.error(err))
}

function loadState (): void {
  if (availableSnippets.value.length === 0) {
    editorContents.value = ''
    CodeEditor.value?.markClean()
    savingStatus.value = ''
    currentSnippetText.value = ''
    currentItem.value = -1
    return // No state to load, only an error to avoid
  }

  if (currentItem.value >= availableSnippets.value.length) {
    currentItem.value = availableSnippets.value.length - 1
  } else if (currentItem.value < 0) {
    currentItem.value = 0
  }

  ipcRenderer.invoke('assets-provider', {
    command: 'get-snippet',
    payload: {
      name: availableSnippets.value[currentItem.value]
    }
  } as AssetsProviderIPCAPI)
    .then(data => {
      editorContents.value = data
      CodeEditor.value?.markClean()
      savingStatus.value = ''
      currentSnippetText.value = availableSnippets.value[currentItem.value]
    })
    .catch(err => console.error(err))
}

function saveSnippet (): void {
  savingStatus.value = trans('Saving …')

  ipcRenderer.invoke('assets-provider', {
    command: 'set-snippet',
    payload: {
      name: availableSnippets.value[currentItem.value],
      contents: editorContents.value
    }
  } as AssetsProviderIPCAPI)
    .then(() => {
      savingStatus.value = trans('Saved!')
      setTimeout(() => {
        savingStatus.value = ''
      }, 1000)
    })
    .catch(err => console.error(err))
}

function addSnippet (): void {
  // Adds a snippet with empty contents and a generic default name
  const newName = ensureUniqueName('snippet')

  ipcRenderer.invoke('assets-provider', {
    command: 'set-snippet',
    payload: {
      name: newName,
      contents: ''
    }
  } as AssetsProviderIPCAPI)
    .then(() => { updateAvailableSnippets(newName) })
    .catch(err => console.error(err))
}

function removeSnippet (idx: number): void {
  if (idx > availableSnippets.value.length - 1 || idx < 0) {
    return
  }

  // Remove the current snippet.
  ipcRenderer.invoke('assets-provider', {
    command: 'remove-snippet',
    payload: { name: availableSnippets.value[idx] }
  } as AssetsProviderIPCAPI)
    .then(() => { updateAvailableSnippets() })
    .catch(err => console.error(err))
}

function renameSnippet (): void {
  let newVal = currentSnippetText.value

  // Sanitise the name
  newVal = newVal.replace(/[^a-zA-Z0-9_-]/g, '-')

  newVal = ensureUniqueName(newVal)

  ipcRenderer.invoke('assets-provider', {
    command: 'rename-snippet',
    payload: {
      name: availableSnippets.value[currentItem.value],
      newName: newVal
    }
  } as AssetsProviderIPCAPI)
    .then(() => { updateAvailableSnippets(newVal) })
    .catch(err => console.error(err))
}

/**
 * Ensures that the given name candidate describes a unique snippet filename
 *
 * @param   {string}  candidate  The candidate's name
 *
 * @return  {string}             The candidate's name, with a number suffix (-X) if necessary
 */
function ensureUniqueName (candidate: string): string {
  if (!availableSnippets.value.includes(candidate)) {
    return candidate // No duplicate detected
  }

  let count = 1
  const match = /-(\d+)$/.exec(candidate)

  if (match !== null) {
    // The candidate name already ends with a number-suffix --> extract it
    count = parseInt(match[1], 10)
    candidate = candidate.substring(0, candidate.length - match[1].length - 1)
  }

  while (availableSnippets.value.includes(candidate + '-' + String(count))) {
    count++
  }

  return candidate + '-' + count
}

function openSnippetsDirectory (): void {
  ipcRenderer.invoke('assets-provider', {
    command: 'open-snippets-directory'
  } as AssetsProviderIPCAPI).catch(err => console.error(err))
}
</script>

<style lang="less">
#snippets-container {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .CodeMirror {
    flex-grow: 1;
  }
}
</style>
