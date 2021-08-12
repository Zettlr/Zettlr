<template>
  <div id="project-lists">
    <!-- ATTENTION: Limited leeway! Be sparse with the space you use! -->
    <p
      v-if="selectedExportFormats.length === 0"
      class="warning"
    >
      <clr-icon shape="warning"></clr-icon>
      <!-- TODO: Translate! -->
      <span>Please select at least one export format to build this project.</span>
    </p>
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
        v-bind:label="exportFormatLabel"
        v-bind:value="exportFormatList"
        v-bind:labels="[exportFormatUseLabel, exportFormatNameLabel]"
        v-bind:editable="[0]"
        v-on:input="selectExportFormat($event)"
      ></ListControl>
    </div>
    <div
      v-show="currentTab === 'files'"
      id="files-panel"
      role="tabpanel"
    >
      <!-- First the glob patterns -->
      <ListControl
        v-model="patterns"
        v-bind:label="exportPatternLabel"
        v-bind:labels="[exportPatternNameLabel]"
        v-bind:editable="[0]"
        v-bind:addable="true"
        v-bind:deletable="true"
      ></ListControl>

      <!-- Then the CSL file -->
      <FileControl
        v-model="cslStyle"
        v-bind:label="'CSL Stylesheet'"
        v-bind:reset="true"
        v-bind:filter="{'csl': 'CSL Stylesheet'}"
      ></FileControl>
    </div>
  </div>
</template>

<script>
import ListControl from '../../../common/vue/form/elements/List'
import FileControl from '../../../common/vue/form/elements/File'

import Vue from 'vue'
import Tabs from '../../../common/vue/Tabs'
import { trans } from '../../../common/i18n-renderer'

const ipcRenderer = window.ipc

export default {
  name: 'ProjectProperties',
  components: {
    ListControl,
    FileControl,
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
      cslStyle: '',
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
    },
    exportFormatLabel: function () {
      return trans('dialog.preferences.project.format')
    },
    exportFormatUseLabel: function () {
      return trans('dialog.preferences.project.use_label')
    },
    exportFormatNameLabel: function () {
      return trans('dialog.preferences.project.name_label')
    },
    exportPatternLabel: function () {
      return trans('dialog.preferences.project.pattern')
    },
    exportPatternNameLabel: function () {
      return trans('dialog.preferences.project.pattern_name')
    }
  },
  watch: {
    patterns: function (newValue, oldValue) {
      this.updateProperties()
    },
    cslStyle: function (newValue, oldValue) {
      this.updateProperties()
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
          this.cslStyle = descriptor.project.cslStyle
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
            filters: this.patterns,
            cslStyle: this.cslStyle
          },
          path: this.fullPath
        }
      }).catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
div#project-lists p.warning {
  display: flex;
  color: rgb(97, 97, 0);
  background-color: rgb(209, 209, 23);
  border: 1px solid rgb(170, 170, 0);
  border-radius: 5px;
  padding: 5px;
  margin: 5px;

  // More spacing between the icon and the text
  span { padding-left: 5px; }
}
</style>
