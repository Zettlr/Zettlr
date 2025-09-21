<template>
  <h1>{{ pageHeading }}</h1>

  <p>
    {{ libraryLabel }}
    <a href="https://docs.zettlr.com/en/core/citations/">{{ learnMoreLabel }}</a>.
  </p>

  <p>
    <FileControl
      v-model="referenceLibrary"
      reset=""
      placeholder="/path/to/library.json"
      v-bind:filter="libraryFilters"
      name="library-input"
    ></FileControl>
  </p>

  <p>
    {{ citeStyleLabel }}
  </p>

  <p class="box">
    <RadioControl
      v-model="citingStyle"
      v-bind:options="citingOptions"
    ></RadioControl>
  </p>
</template>

<script setup lang="ts">
import { trans } from 'source/common/i18n-renderer'
import FileControl from 'source/common/vue/form/elements/FileControl.vue'
import RadioControl from 'source/common/vue/form/elements/RadioControl.vue'
import { ref, watch } from 'vue'

const pageHeading = trans('Citations')
const libraryLabel = trans('If you already have a library of references, you can select it here to make all your stored reference items available to Zettlr.')
const learnMoreLabel = trans('Learn how to export your Zotero library')
const citeStyleLabel = trans('Different academic fields have different citation styles. Here you choose which one Zettlr uses when you autocomplete citations.')

const libraryFilters = [
  { extensions: [ 'json', 'yaml', 'yml', 'bib' ], name: 'CSL JSON or BibTeX' },
  { extensions: [ 'json', 'yaml', 'yml' ], name: 'CSL JSON' },
  { extensions: ['bib'], name: 'BibTeX' }
]

const citingOptions = {
  regular: '[@Author2015, p. 123] → (Author 2015, 123)',
  'in-text': '@Author2015 → Author (2015)',
  'in-text-suffix': '@Author2015 [p. 123] → Author (2015, 123)'
}

const referenceLibrary = ref(window.config.get('export.cslLibrary'))
const citingStyle = ref(window.config.get('editor.citeStyle') as 'in-text'|'in-text-suffix'|'regular')

watch(referenceLibrary, () => {
  window.config.set('export.cslLibrary', referenceLibrary.value)
})

watch(citingStyle, () => {
  window.config.set('editor.citeStyle', citingStyle.value)
})

</script>

<style lang="less">
#field-input-library-input {
  display: flex;

  .input-text-button-group {
    flex-grow: 1;
  }
}
</style>
