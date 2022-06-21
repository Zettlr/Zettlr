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

      <p v-if="selectedExportProfiles.length === 0" class="warning">
        <clr-icon shape="warning"></clr-icon>
        <!-- TODO: Translate! -->
        <span>Please select at least one profile to build this project.</span>
      </p>
      <ListControl
        v-bind:label="exportFormatLabel"
        v-bind:model-value="exportFormatList"
        v-bind:labels="[exportFormatUseLabel, exportFormatNameLabel, 'Conversion']"
        v-bind:editable="[0]"
        v-on:update:model-value="selectExportProfile($event)"
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
      <!-- Also, the other possible files users can override -->
      <FileControl
        v-model="texTemplate"
        v-bind:label="'LaTeX Template'"
        v-bind:reset="true"
        v-bind:filter="{'tex': 'LaTeX Source'}"
      ></FileControl>
      <FileControl
        v-model="htmlTemplate"
        v-bind:label="'HTML Template'"
        v-bind:reset="true"
        v-bind:filter="{'html,htm': 'HTML Template'}"
      ></FileControl>
    </div>
  </WindowChrome>
</template>

<script lang="ts">
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

import { trans } from '@common/i18n-renderer'
import WindowChrome from '@common/vue/window/Chrome.vue'
import ListControl from '@common/vue/form/elements/List.vue'
import FileControl from '@common/vue/form/elements/File.vue'
import TextControl from '@common/vue/form/elements/Text.vue'
import { defineComponent } from 'vue'
import { ProjectSettings } from '@dts/common/fsal'
import { WindowTab } from '@dts/renderer/window'
import { PandocProfileMetadata } from '@dts/common/assets'
import { PANDOC_READERS, PANDOC_WRITERS, SUPPORTED_READERS } from '@common/util/pandoc-maps'

const ipcRenderer = window.ipc

interface ExportProfile { selected: boolean, name: string, conversion: string }

export default defineComponent({
  components: {
    WindowChrome,
    ListControl,
    FileControl,
    TextControl
  },
  data: function () {
    return {
      dirPath: '',
      profiles: [] as PandocProfileMetadata[],
      selectedExportProfiles: [] as string[], // NOTE: Must correspond to the defaults in fsal-directory.ts
      patterns: [],
      cslStyle: '',
      texTemplate: '',
      htmlTemplate: '',
      projectTitle: '',
      tabs: [
        {
          id: 'formats-control',
          label: 'General',
          icon: 'cog',
          controls: 'formats-panel'
        },
        {
          id: 'files-control',
          label: 'Files',
          icon: 'file-settings',
          controls: 'formats-panel'
        }
      ] as WindowTab[],
      currentTab: 0
    }
  },
  computed: {
    windowTitle: function (): string {
      return this.projectTitle
    },
    exportFormatList: function (): ExportProfile[] {
      // We need to return a list of { selected: boolean, name: string, conversion: string }
      return this.profiles.filter(e => SUPPORTED_READERS.includes(e.reader)).map(e => {
        const reader = e.reader in PANDOC_READERS ? PANDOC_READERS[e.reader] : e.reader
        const writer = e.writer in PANDOC_WRITERS ? PANDOC_WRITERS[e.writer] : e.writer
        const conversionString = (e.isInvalid) ? 'Invalid' : [ reader, writer ].join(' → ')

        return {
          selected: this.selectedExportProfiles.includes(e.name),
          name: this.getDisplayText(e.name),
          conversion: conversionString
        }
      })
    },
    exportFormatLabel: function (): string {
      return trans('dialog.preferences.project.format')
    },
    exportFormatUseLabel: function (): string {
      return trans('dialog.preferences.project.use_label')
    },
    exportFormatNameLabel: function (): string {
      return trans('dialog.preferences.project.name_label')
    },
    exportPatternLabel: function (): string {
      return trans('dialog.preferences.project.pattern')
    },
    exportPatternNameLabel: function (): string {
      return trans('dialog.preferences.project.pattern_name')
    }
  },
  watch: {
    selectedExportProfiles: function () {
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
    texTemplate: function (newValue, oldValue) {
      this.updateProperties()
    },
    htmlTemplate: function (newValue, oldValue) {
      this.updateProperties()
    },
    dirPath: function (newValue, oldValue) {
      this.fetchProperties()
    }
  },
  mounted: function () {
    // First, we need to get the available export formats
    ipcRenderer.invoke('assets-provider', {
      command: 'list-export-profiles'
    })
      .then((defaults: PandocProfileMetadata[]) => {
        this.profiles = defaults
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
    selectExportProfile: function (newListVal: ExportProfile[]) {
      const newProfiles = newListVal.filter(e => e.selected).map(e => {
        return this.profiles.find(x => this.getDisplayText(x.name) === e.name)
      }).filter(x => x !== undefined) as PandocProfileMetadata[]
      this.selectedExportProfiles = newProfiles.map(x => x.name)
      this.updateProperties()
    },
    getDisplayText: function (name: string): string {
      return name.substring(0, name.lastIndexOf('.'))
    },
    updateProperties: function () {
      ipcRenderer.invoke('application', {
        command: 'update-project-properties',
        payload: {
          properties: {
            profiles: this.selectedExportProfiles.map(e => e), // De-proxy
            filters: this.patterns.map(e => e), // De-proxy
            cslStyle: this.cslStyle,
            title: this.projectTitle,
            templates: {
              tex: this.texTemplate,
              html: this.htmlTemplate
            }
          } as ProjectSettings,
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
            this.selectedExportProfiles = descriptor.project.profiles
            this.patterns = descriptor.project.filters
            this.cslStyle = descriptor.project.cslStyle
            this.htmlTemplate = descriptor.project.templates.html
            this.texTemplate = descriptor.project.templates.tex
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
})
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
