<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:disable-vibrancy="true"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Properties'"
    v-on:tab="currentTab = $event"
  >
    <div
      v-show="currentTab === 0"
      id="formats-panel"
      role="tabpanel"
    >
      <!-- Add the project title field -->
      <TextControl
        v-model="projectTitle"
        v-bind:label="'Project Title'"
      ></TextControl>

      <p v-if="selectedExportFormats.length === 0" class="warning">
        <clr-icon shape="warning"></clr-icon>
        <!-- TODO: Translate! -->
        <span>Please select at least one export format to build this project.</span>
      </p>
      <ListControl
        v-bind:label="exportFormatLabel"
        v-bind:value="exportFormatList"
        v-bind:labels="[exportFormatUseLabel, exportFormatNameLabel]"
        v-bind:editable="[0]"
        v-on:input="selectExportFormat($event)"
      ></ListControl>
    </div>
    <div
      v-show="currentTab === 1"
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
  </WindowChrome>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Project Properties
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays the project properties.
 *
 * END HEADER
 */

import { trans } from '../common/i18n-renderer'
import WindowChrome from '../common/vue/window/Chrome.vue'
import ListControl from '../common/vue/form/elements/List'
import FileControl from '../common/vue/form/elements/File'
import TextControl from '../common/vue/form/elements/Text'
import Vue from 'vue'

const ipcRenderer = window.ipc

export default {
  name: 'ProjectProperties',
  components: {
    WindowChrome,
    ListControl,
    FileControl,
    TextControl
  },
  data: function () {
    return {
      dirPath: '',
      exportFormatMap: {},
      selectedExportFormats: [ 'html', 'chromium-pdf' ], // NOTE: Must correspond to the defaults in fsal-directory.ts
      patterns: [],
      cslStyle: '',
      projectTitle: '',
      tabs: [
        {
          id: 'formats-control',
          target: 'formats-panel',
          label: 'General',
          icon: 'cog',
          controls: 'formats-panel'
        },
        {
          id: 'files-control',
          target: 'files-panel',
          label: 'Files',
          icon: 'file-settings',
          controls: 'formats-panel'
        }
      ],
      currentTab: 0
    }
  },
  computed: {
    windowTitle: function () {
      return this.projectTitle
    },
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
    selectedExportFormats: function () {
      this.updateProperties()
    },
    projectTitle: function () {
      this.updateProperties()
    },
    patterns: function (newValue, oldValue) {
      this.updateProperties()
    },
    cslStyle: function (newValue, oldValue) {
      this.updateProperties()
    },
    dirPath: function (newValue, oldValue) {
      this.fetchProperties()
    }
  },
  mounted: function () {
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

    if (this.dirPath !== '') {
      // Get the properties if we already have a dirPath
      this.fetchProperties()
    }

    // We listen to filetree changes -- in case one of these means that our
    // dir is no longer a project, fetchProperties will automatically close this
    // window.
    ipcRenderer.on('fsal-state-changed', (event, kind) => {
      if (kind === 'filetree') {
        this.fetchProperties()
      }
    })
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
            cslStyle: this.cslStyle,
            title: this.projectTitle
          },
          path: this.dirPath
        }
      }).catch(err => console.error(err))
    },
    fetchProperties: function () {
      ipcRenderer.invoke('application', {
        command: 'get-descriptor',
        payload: this.dirPath
      })
        .then(descriptor => {
          // Save the actually used formats.
          if (descriptor.project !== null) {
            this.selectedExportFormats = descriptor.project.formats
            this.patterns = descriptor.project.filters
            this.cslStyle = descriptor.project.cslStyle
            this.projectTitle = descriptor.project.title
          } else {
            // Apparently the user kept the window open and removed the project
            // state on this project. So let's close this window silently.
            ipcRenderer.send('window-controls', { command: 'win-close' })
          }
        })
        .catch(err => console.error(err))
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

div[role="tabpanel"] {
  overflow: auto; // Enable scrolling, if necessary
  padding: 10px;
  width: 100%;
}
</style>
