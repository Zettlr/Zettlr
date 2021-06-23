<template>
  <div id="project-lists">
    <!-- ATTENTION: Limited leeway! Be sparse with the space you use! -->
    <ListControl
      v-bind:label="''"
      style="float: left;"
      v-bind:value="exportFormatList"
      v-bind:labels="['Use', 'Format']"
      v-bind:editable="[0]"
      v-on:input="selectExportFormat($event)"
    ></ListControl>

    <ListControl
      v-bind:label="'The file list is not yet implemented'"
      style="float: right;"
      v-bind:value="[
        { selected: true, format: 'introduction.md' },
        { selected: true, format: 'chapter 2.md' },
        { selected: false, format: 'My Notes.md' },
        { selected: true, format: 'conclusion.md' }
      ]"
      v-bind:labels="['Include', 'Filename']"
      v-bind:editable="[0]"
    ></ListControl>
  </div>
</template>

<script>
import ListControl from '../../../common/vue/form/elements/List'
import Vue from 'vue'

const ipcRenderer = window.ipc

export default {
  name: 'ProjectProperties',
  components: {
    ListControl
  },
  props: {
    fullPath: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      exportFormatMap: {},
      selectedExportFormats: []
    }
  },
  computed: {
    exportFormatList: function () {
      // We need to return a list of { selected: boolean, format: 'string' }
      return Object.keys(this.exportFormatMap).map(e => {
        return {
          selected: this.selectedExportFormats.includes(this.exportFormatMap[e]),
          format: e
        }
      })
    }
  },
  created: function () {
    // First, we need to get the available export formats
    ipcRenderer.invoke('application', {
      command: 'get-available-export-formats'
    })
      .then(exporterInformation => {
        // We only need to know the readable string for an exportable format
        // and the identifier. The list will be populated using the keys
        // (human-readable string), and the actual value will consist of the
        // values (the identifiers).
        for (const info of exporterInformation) {
          // NOTE: We are switching "id: readable" to "readable: id" here so
          // that it's much easier to retrieve the identifier later on.
          for (const key in info.formats) {
            Vue.set(this.exportFormatMap, info.formats[key], key)
          }
        }
      })
      .catch(err => console.error(err))

    // Second, we need to get the formats actually being used.
    ipcRenderer.invoke('application', {
      command: 'get-descriptor',
      payload: this.fullPath
    })
      .then(descriptor => {
        // Save the actually used formats. NOTE: It can be that the project of
        // the descriptor is still null in case the user switched on the project
        // capabilities just yet. In that case, simply don't do anything. They
        // might then just select something and save the changes afterwards.
        if (descriptor.project !== null) {
          this.selectedExportFormats = descriptor.project.formats
        }
      })
      .catch(err => console.error(err))
  },
  methods: {
    selectExportFormat: function (newListVal) {
      const newFormats = newListVal.filter(e => e.selected).map(e => {
        return this.exportFormatMap[e.format]
      })
      this.selectedExportFormats = newFormats
      this.updateProperties()
    },
    updateProperties: function () {
      ipcRenderer.invoke('application', {
        command: 'update-project-properties',
        payload: {
          properties: {
            'formats': this.selectedExportFormats
          },
          path: this.fullPath
        }
      }).catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
div#project-lists {
  display: flex;

  & > * { flex: 1; }
}
</style>
