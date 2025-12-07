<template>
  <div class="asset-container">
    <ZtrAdmonition type="info" class="asset-admonition">
      {{ cssExplanation }}
    </ZtrAdmonition>
    <ZtrAdmonition type="warning" class="asset-admonition">
      {{ cssWarning }}
    </ZtrAdmonition>
    <CodeEditor
      ref="code-editor"
      v-model="editorContents"
      v-bind:mode="'css'"
    ></CodeEditor>
    <!-- This div is used to keep the buttons in a line despite the flex -->
    <div class="save-asset-file">
      <ButtonControl
        class="save-button"
        v-bind:primary="true"
        v-bind:label="saveButtonLabel"
        v-bind:inline="true"
        v-on:click="saveCSS()"
      ></ButtonControl>
      <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CustomCSS
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Entry point app component for the Custom CSS editor.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import CodeEditor from '@common/vue/CodeEditor.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import ZtrAdmonition from 'source/common/vue/ZtrAdmonition.vue'
import { onUnmounted, ref, watch } from 'vue'

const ipcRenderer = window.ipc

const cssExplanation = trans('Here you can override the styles of Zettlr to customise it even further.')
const cssWarning = trans('Attention: This file overrides all CSS directives! Never alter the geometry of elements, otherwise the app may expose unwanted behaviour!')
const saveButtonLabel = trans('Save')

const editorContents = ref('')
const savingStatus = ref('')
const lastLoadedCSS = ref('')

watch(editorContents, () => {
  if (editorContents.value === lastLoadedCSS.value) {
    savingStatus.value = ''
  } else {
    savingStatus.value = trans('Unsaved changes')
  }
})

ipcRenderer.invoke('css-provider', {
  command: 'get-custom-css'
})
  .then(cssString => {
    lastLoadedCSS.value = cssString
    editorContents.value = cssString
  })
  .catch(e => console.error(e))

const offCallback = ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'save-file') {
    saveCSS()
  }
})

onUnmounted(() => { offCallback() })

function saveCSS (): void {
  savingStatus.value = trans('Saving …')
  ipcRenderer.invoke('css-provider', {
    command: 'set-custom-css',
    css: editorContents.value
  })
    .then(() => {
      lastLoadedCSS.value = editorContents.value
      setTimeout(() => { savingStatus.value = trans('Saved!') }, 0)
      setTimeout(() => { savingStatus.value = '' }, 1000)
    })
    .catch(err => {
      savingStatus.value = trans('Saving failed')
      console.error(err)
    })
}
</script>

<style lang="less">
//
</style>
