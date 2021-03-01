<template>
  <div>
    <h4>Export</h4>
    <SelectControl
      v-model="format"
      v-bind:label="'Format'"
      v-bind:options="formatOptions"
    ></SelectControl>
    <SelectControl
      v-if="format === 'revealjs'"
      v-model="revealJS"
      v-bind:label="'Design'"
      v-bind:options="revealJSOptions"
    ></SelectControl>
    <hr>
    <RadioControl
      v-model="exportDirectory"
      v-bind:options="{
        'temp': 'Temporary directory',
        'cwd': 'Current directory'
      }"
    ></RadioControl>
    <button
      v-on:click="doExport"
    >
      Export
    </button>
  </div>
</template>

<script>
import SelectControl from '../common/vue/form/elements/Select'
import RadioControl from '../common/vue/form/elements/Radio'

export default {
  name: 'PopoverExport',
  components: {
    SelectControl,
    RadioControl
  },
  data: function () {
    return {
      shouldExport: false, // As soon as this becomes true, we can export
      format: 'html', // Will be the final format, except revealJS ...
      revealJS: 'revealjs-black', // ... when this will be the final format.
      exportDirectory: 'temp'
    }
  },
  computed: {
    popoverData: function () {
      return {
        shouldExport: this.shouldExport,
        format: (this.format === 'revealjs') ? this.revealJS : this.format,
        exportTo: this.exportDirectory
      }
    },
    formatOptions: function () {
      return {
        'html': 'HTML',
        'pdf': 'PDF',
        'docx': 'Microsoft Word',
        'odt': 'OpenDocument Text',
        'rtf': 'RichText Document',
        'revealjs': 'reveal.js Presentation',
        'rst': 'reStructuredText',
        'latex': 'LaTeX',
        'plain': 'Plain Text',
        'org': 'Emacs Org Mode',
        'textbundle': 'TextBundle',
        'textpack': 'TextPack'
      }
    },
    revealJSOptions: function () {
      return {
        'revealjs-black': 'Black',
        'revealjs-moon': 'Moon',
        'revealjs-league': 'League',
        'revealjs-sky': 'Sky',
        'revealjs-beige': 'Beige',
        'revealjs-solarized': 'Solarized',
        'revealjs-serif': 'Serif',
        'revealjs-white': 'White'
      }
    }
  },
  methods: {
    doExport: function () {
      this.shouldExport = true
    }
  }
}
</script>

<style lang="less">
//
</style>
