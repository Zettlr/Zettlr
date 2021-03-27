<template>
  <div>
    <h4>Export</h4>
    <SelectControl
      v-model="format"
      v-bind:label="'Format'"
      v-bind:options="availableFormats"
    ></SelectControl>
    <!-- Here we can enumerate options for the currently selected format. -->
    <Form
      v-if="formSchema.fieldsets.length > 0"
      ref="form"
      v-bind:model="currentOptions"
      v-bind:schema="formSchema"
      v-on:input="handleInput"
    ></Form>
    <!-- The choice of working directory vs. temporary applies to all exporters -->
    <hr>
    <RadioControl
      v-model="exportDirectory"
      v-bind:options="{
        'temp': 'Temporary directory',
        'cwd': 'Current directory'
      }"
    ></RadioControl>
    <!-- Add the exporting button -->
    <button v-on:click="doExport">
      Export
    </button>
  </div>
</template>

<script>
import RadioControl from '../common/vue/form/elements/Radio'
import SelectControl from '../common/vue/form/elements/Select'
import Form from '../common/vue/form/Form'
import { ipcRenderer } from 'electron'
import Vue from 'vue'

export default {
  name: 'PopoverExport',
  components: {
    SelectControl,
    RadioControl,
    Form
  },
  data: function () {
    return {
      shouldExport: false, // As soon as this becomes true, we can export
      format: 'html',
      exportDirectory: 'temp',
      exporterInfo: [],
      currentOptions: {}
    }
  },
  computed: {
    popoverData: function () {
      return {
        shouldExport: this.shouldExport,
        format: this.format,
        formatOptions: this.currentOptions,
        exportTo: this.exportDirectory
      }
    },
    availableFormats: function () {
      const formats = {}
      for (const info of this.exporterInfo) {
        for (const format in info.formats) {
          formats[format] = info.formats[format]
        }
      }
      return formats
    },
    formSchema: function () {
      for (const info of this.exporterInfo) {
        if (this.format in info.formats) {
          // Finally return the options
          return {
            fieldsets: [info.options]
          }
        }
      }
      return { fieldsets: [] }
    }
  },
  watch: {
    formSchema: function () {
      this.currentOptions = {}
      for (const info of this.exporterInfo) {
        if (this.format in info.formats) {
          for (const option of info.options) {
            Vue.set(this.currentOptions, option.model, option.initialValue)
          }
        }
      }
    }
  },
  created: function () {
    ipcRenderer.invoke('application', {
      command: 'get-available-export-formats'
    })
      .then(exporterInformation => {
        // Save all the exporter information into the array. The computed
        // properties will take the info from that array and re-compute based
        // on the value of "format".
        this.exporterInfo = exporterInformation
      })
      .catch(err => console.error(err))
  },
  methods: {
    doExport: function () {
      this.shouldExport = true
    },
    handleInput: function (prop, val) {
      Vue.set(this.currentOptions, prop, val)
    }
  }
}
</script>

<style lang="less">
//
</style>
