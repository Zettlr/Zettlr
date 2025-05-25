<template>
  <div id="custom-css">
    <p id="custom-css-info" v-html="customCSSInfo"></p>
    <CodeEditor
      ref="code-editor"
      v-model="editorContents"
      v-bind:mode="'css'"
    ></CodeEditor>
    <ButtonControl
      v-bind:primary="true"
      v-bind:label="saveButtonLabel"
      v-bind:inline="true"
      v-on:click="saveCSS()"
    ></ButtonControl>
    <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
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
import { onUnmounted, ref, watch } from 'vue'

const ipcRenderer = window.ipc

const customCSSInfo = trans('Here you can override the styles of Zettlr to customise it even further. <strong>Attention: This file overrides all CSS directives! Never alter the geometry of elements, otherwise the app may expose unwanted behaviour!</strong>')
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
      savingStatus.value = ''
    })
    .catch(e => {
      savingStatus.value = trans('Saving failed')
      console.error(e)
    })
}
</script>

<style lang="less">
div#custom-css {
  overflow: auto; // Enable scrolling, if necessary
  padding: 10px;
  width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;

  .CodeMirror {
    flex-grow: 1;
  }
}

p#custom-css-info {
  margin-bottom: 20px;
}
</style>
