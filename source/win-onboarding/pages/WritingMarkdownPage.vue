<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ renderingModeIntro }}
  </p>

  <p class="flex-buttons">
    <button
      v-bind:class="{ active: renderingMode === 'preview' }"
      v-on:click="renderingMode = 'preview'"
    >
      WYSIWYG
    </button>
    <button
      v-bind:class="{ active: renderingMode === 'raw'}"
      v-on:click="renderingMode = 'raw'"
    >
      {{ rawLabel }}
    </button>
  </p>

  <p>
    {{ autosaveIntro }}
  </p>

  <p class="flex-buttons">
    <button
      v-bind:class="{ active: autosave === 'off' }"
      v-on:click="autosave = 'off'"
    >
      {{ manualLabel }}
    </button>
    <button
      v-bind:class="{ active: autosave !== 'off' }"
      v-on:click="autosave = 'immediately'"
    >
      {{ autosaveLabel }}
    </button>
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import { ref, watch } from 'vue'

const pageHeading = trans('Writing Markdown')
const renderingModeIntro = trans('The core of Zettlr is writing Markdown, which can be shown using either its raw syntax, or in a WYSIWYG mode. Which one do you prefer?')
const rawLabel = trans('Raw Syntax')
const autosaveIntro = trans('Some people prefer an app automatically saving your work; others want to manually save. Which do you prefer?')
const manualLabel = trans('Save manually')
const autosaveLabel = trans('Activate Autosave')

const renderingMode = ref(window.config.get('display.renderingMode') as 'preview'|'raw')
const showWhitespace = ref(Boolean(window.config.get('editor.showWhitespace')))
const showStatusbar = ref(Boolean(window.config.get('editor.showStatusbar')))
const autosave = ref(window.config.get('editor.autoSave') as 'off'|'immediately'|'delayed')
const showFormattingToolbar = ref(Boolean(window.config.get('editor.showFormattingToolbar')))

watch(renderingMode, () => {
  window.config.set('display.renderingMode', renderingMode.value)
})

watch(showWhitespace, () => {
  window.config.set('editor.showWhitespace', showWhitespace.value)
})

watch(showStatusbar, () => {
  window.config.set('editor.showStatusbar', showStatusbar.value)
})

watch(autosave, () => {
  window.config.set('editor.autoSave', autosave.value)
})

watch(showFormattingToolbar, () => {
  window.config.set('editor.showFormattingToolbar', showFormattingToolbar.value)
})
</script>

<style lang="less">
p.flex-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
