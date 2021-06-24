<template>
  <div id="project-lists">
    <!-- ATTENTION: Limited leeway! Be sparse with the space you use! -->
    <Tabs
      v-bind:tabs="tabs"
      v-bind:current-tab="currentTab"
      v-on:tab="currentTab = $event"
    ></Tabs>

    <div
      v-show="currentTab === 'formats'"
      id="formats-panel"
      role="tabpanel"
    >
      <ListControl
        v-bind:label="''"
        v-bind:value="exportFormatList"
        v-bind:labels="['Use', 'Format']"
        v-bind:editable="[0]"
        v-on:input="selectExportFormat($event)"
      ></ListControl>
    </div>
    <div
      v-show="currentTab === 'files'"
      id="files-panel"
      role="tabpanel"
    >
      <ListControl
        v-model="patterns"
        v-bind:label="'Add Glob patterns to include only specific files'"
        v-bind:labels="['Glob Pattern']"
        v-bind:editable="[0]"
        v-bind:addable="true"
        v-bind:deletable="true"
      ></ListControl>
    </div>
  </div>
</template>

<script>
import ListControl from '../../../common/vue/form/elements/List'
import Vue from 'vue'
import Tabs from '../../../common/vue/Tabs'

const ipcRenderer = window.ipc

export default {
  name: 'ProjectProperties',
  components: {
    ListControl,
    Tabs
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
      selectedExportFormats: [],
      patterns: [],
      tabs: [
        {
          id: 'formats',
          target: 'formats-panel',
          label: 'Formats'
        },
        {
          id: 'files',
          target: 'files-panel',
          label: 'Files'
        }
      ],
      currentTab: 'formats'
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
          this.patterns = descriptor.project.filters
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
            formats: this.selectedExportFormats,
            filters: this.patterns
          },
          path: this.fullPath
        }
      }).catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
</style>
