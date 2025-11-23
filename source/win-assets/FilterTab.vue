<template>
  <SplitView
    v-bind:initial-size-percent="[ 20, 80 ]"
    v-bind:minimum-size-percent="[ 20, 20 ]"
    v-bind:reset-size-percent="[ 20, 80 ]"
    v-bind:split="'horizontal'"
    v-bind:initial-total-width="100"
  >
    <template #view1>
      <div id="filter-container-list">
        <SelectableList
          v-bind:items="listItems"
          v-bind:selected-item="currentItem"
          v-bind:editable="true"
          v-bind:add-text-item="true"
          v-on:add="addFilter($event)"
          v-on:select="currentItem = $event"
          v-on:remove="removeFilter($event)"
        ></SelectableList>
        <ButtonControl
          v-bind:label="openFilterFolderLabel"
          v-bind:inline="false"
          v-on:click="openFilterDirectory"
        ></ButtonControl>
      </div>
    </template>
    <template #view2>
      <div id="filter-container">
        <ZtrAdmonition v-bind:type="'info'">
          {{ filterExplanation }}
        </ZtrAdmonition>

        <ZtrAdmonition v-if="currentItem >= 0 && protectedFilters.includes(availableFilters[currentItem])" type="warning" style="margin-top: 10px">
          {{ protectedFilterWarning }}
        </ZtrAdmonition>

        <template v-if="currentItem < 0">
          <ZtrAdmonition v-bind:type="'warning'" style="margin-top: 10px">
            {{ noFilterMessage }}
          </ZtrAdmonition>
        </template>
        <template v-else>
          <p>
            <TextControl
              v-model="currentFilterText"
              class="filter-name-input"
              v-bind:inline="false"
              v-bind:disabled="currentItem < 0"
              v-on:confirm="renameFilter()"
            ></TextControl>
            <ButtonControl
              v-bind:label="renameFilterLabel"
              v-bind:inline="true"
              v-bind:disabled="availableFilters.length === 0 || currentFilterText === availableFilters[currentItem]"
              v-on:click="renameFilter()"
            ></ButtonControl>
          </p>

          <CodeEditor
            ref="code-editor"
            v-model="editorContents"
            v-bind:mode="'lua'"
            v-bind:readonly="currentItem < 0"
          ></CodeEditor>
          <div class="save-filter-file">
            <ButtonControl
              v-bind:primary="true"
              v-bind:label="saveButtonLabel"
              v-bind:inline="true"
              v-bind:disabled="currentItem < 0 || ($refs['code-editor'] != null && ($refs['code-editor'] as any).isClean())"
              v-on:click="saveFilter()"
            ></ButtonControl>
            <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
          </div>
        </template>
      </div>
    </template>
  </SplitView>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FilterTab
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This view exposes the Lua filters to the user.
 *
 * END HEADER
 */

import SplitView from '@common/vue/window/SplitView.vue'
import SelectableList, { type SelectableListItem } from '@common/vue/form/elements/SelectableList.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import CodeEditor from '@common/vue/CodeEditor.vue'
import { trans } from '@common/i18n-renderer'
import { ref, watch, onUnmounted, computed, onMounted } from 'vue'
import type { AssetsProviderIPCAPI } from 'source/app/service-providers/assets'
import ZtrAdmonition from 'source/common/vue/ZtrAdmonition.vue'

const ipcRenderer = window.ipc

const noFilterMessage = trans('No filter selected.')
const protectedFilterWarning = trans('This filter is protected. It will be restored if you rename or remove this file.')
const saveButtonLabel = trans('Save')
const renameFilterLabel = trans('Rename filter')
const filterExplanation = trans('Lua filters allow customization of your Pandoc exports.')
const openFilterFolderLabel = trans('Open filter folder')

const currentItem = ref(-1)
const currentFilterText = ref('')
const editorContents = ref('')
const lastLoadedEditorContents = ref('')
const savingStatus = ref('')
const availableFilters = ref<string[]>([])
const protectedFilters = ref<string[]>([])

const listItems = computed<SelectableListItem[]>(() => {
  return availableFilters.value
    .map(filter => {
      return {
        displayText: filter.substring(0, filter.lastIndexOf('.')),
        icon: protectedFilters.value.includes(filter) ? 'lock' : undefined,
        solidIcon: true
      }
    })
})

watch(currentItem, () => {
  loadState()
})

watch(editorContents, () => {
  if (editorContents.value === lastLoadedEditorContents.value) {
    savingStatus.value = ''
  } else {
    savingStatus.value = trans('Unsaved changes')
  }
})

// Immediately update the available filters
updateAvailableFilters()

const offCallback = ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'save-file') {
    saveFilter()
  }
})

onMounted(() => {
  getProtectedFilters()
})

onUnmounted(() => { offCallback() })

function updateAvailableFilters (selectAfterUpdate?: string): void {
  ipcRenderer.invoke('assets-provider', { command: 'list-filter' } as AssetsProviderIPCAPI)
    .then(data => {
      availableFilters.value = data
      if (typeof selectAfterUpdate === 'string' && availableFilters.value.includes(selectAfterUpdate)) {
        currentItem.value = availableFilters.value.indexOf(selectAfterUpdate)
      }
      loadState()
    })
    .catch(err => console.error(err))
}

function getProtectedFilters (): void {
  ipcRenderer.invoke('assets-provider', { command: 'list-protected-filter' } as AssetsProviderIPCAPI)
    .then(files => {
      protectedFilters.value = files
    })
    .catch(err => console.error(err))
}

function loadState (): void {
  if (availableFilters.value.length === 0) {
    editorContents.value = ''
    CodeEditor.value?.markClean()
    savingStatus.value = ''
    currentFilterText.value = ''
    currentItem.value = -1
    return // No state to load, only an error to avoid
  }

  if (currentItem.value >= availableFilters.value.length) {
    currentItem.value = availableFilters.value.length - 1
  } else if (currentItem.value < 0) {
    currentItem.value = 0
  }

  ipcRenderer.invoke('assets-provider', {
    command: 'get-filter',
    payload: {
      filename: availableFilters.value[currentItem.value]
    }
  } as AssetsProviderIPCAPI)
    .then(data => {
      editorContents.value = data
      CodeEditor.value?.markClean()
      lastLoadedEditorContents.value = data
      savingStatus.value = ''
      currentFilterText.value = availableFilters.value[currentItem.value]
    })
    .catch(err => console.error(err))
}

function saveFilter (): void {
  savingStatus.value = trans('Saving …')

  ipcRenderer.invoke('assets-provider', {
    command: 'set-filter',
    payload: {
      filename: availableFilters.value[currentItem.value],
      contents: editorContents.value
    }
  } as AssetsProviderIPCAPI)
    .then(() => {
      lastLoadedEditorContents.value = editorContents.value
      setTimeout(() => { savingStatus.value = trans('Saved!') }, 1000)
      setTimeout(() => { savingStatus.value = '' }, 2000)
    })
    .catch(err => console.error(err))
}

function addFilter (newName?: string): void {
  // Adds a filter with empty contents and a generic default name
  if (newName !== undefined) {
    newName = newName.trim()
  }
  if (newName === undefined || newName === '') {
    newName = ensureUniqueName('filter')
  }

  ipcRenderer.invoke('assets-provider', {
    command: 'set-filter',
    payload: {
      filename: newName,
      contents: ''
    }
  } as AssetsProviderIPCAPI)
    .then(() => { updateAvailableFilters(newName) })
    .catch(err => console.error(err))
}

function removeFilter (idx: number): void {
  if (idx > availableFilters.value.length - 1 || idx < 0) {
    return
  }

  // Remove the current filter.
  ipcRenderer.invoke('assets-provider', {
    command: 'remove-filter',
    payload: { filename: availableFilters.value[idx] }
  } as AssetsProviderIPCAPI)
    .then(() => { updateAvailableFilters() })
    .catch(err => console.error(err))
}

function renameFilter (): void {
  let newVal = currentFilterText.value

  // Sanitise the name
  newVal = newVal.replace(/[^a-zA-Z0-9_-]/g, '-')

  newVal = ensureUniqueName(newVal)

  ipcRenderer.invoke('assets-provider', {
    command: 'rename-filter',
    payload: {
      oldName: availableFilters.value[currentItem.value],
      newName: newVal
    }
  } as AssetsProviderIPCAPI)
    .then(() => { updateAvailableFilters(newVal) })
    .catch(err => console.error(err))
}

/**
 * Ensures that the given name candidate describes a unique filter filename
 *
 * @param   {string}  candidate  The candidate's name
 *
 * @return  {string}             The candidate's name, with a number suffix (-X) if necessary
 */
function ensureUniqueName (candidate: string): string {
  if (!availableFilters.value.includes(candidate)) {
    return candidate // No duplicate detected
  }

  let count = 1
  const match = /-(\d+)$/.exec(candidate)

  if (match !== null) {
    // The candidate name already ends with a number-suffix --> extract it
    count = parseInt(match[1], 10)
    candidate = candidate.substring(0, candidate.length - match[1].length - 1)
  }

  while (availableFilters.value.includes(candidate + '-' + String(count))) {
    count++
  }

  return candidate + '-' + count
}

function openFilterDirectory (): void {
  ipcRenderer.invoke('assets-provider', {
    command: 'open-filter-directory'
  } as AssetsProviderIPCAPI).catch(err => console.error(err))
}
</script>

<style lang="less">
#filter-container-list {
  display: flex;
  flex-direction: column;
  height: stretch;

  .form-control {
    display: flex;
    padding: 10px;

    button {
      flex: 1;
    }
  }
}

#filter-container {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .filter-name-input {
    flex: 1;
  }

  .save-filter-file {
    padding: 10px 0px;
    display: flex;
    gap: 15px;

    button {
      width: 50px;
    }
  }

  .form-control {
    button:not(.input-reset-button) {
      height: stretch;
    }
  }

  p {
    display: flex;
    gap: 15px;
    margin-top: 5px;
  }

  .CodeMirror {
    flex-grow: 1;
  }
}
</style>
