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
        v-bind:label="projectTitleLabel"
      ></TextControl>

      <p v-if="selectedExportProfiles.length === 0" class="warning">
        <cds-icon shape="warning"></cds-icon>
        <span>{{ projectBuildWarning }}</span>
      </p>
      <ListControl
        v-bind:label="exportFormatLabel"
        v-bind:model-value="exportFormatList"
        v-bind:labels="[exportFormatUseLabel, exportFormatNameLabel, conversionLabel]"
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
        v-bind:label="cslStyleLabel"
        v-bind:reset="true"
        v-bind:filter="{'csl': 'CSL Stylesheet'}"
      ></FileControl>
      <!-- Also, the other possible files users can override -->
      <FileControl
        v-model="texTemplate"
        v-bind:label="texTemplateLabel"
        v-bind:reset="true"
        v-bind:filter="{'tex': 'LaTeX Source'}"
      ></FileControl>
      <FileControl
        v-model="htmlTemplate"
        v-bind:label="htmlTemplateLabel"
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
import { DirDescriptor, ProjectSettings } from '@dts/common/fsal'
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
      patterns: [] as string[],
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
      return trans('Export project to:')
    },
    exportFormatUseLabel: function (): string {
      return trans('Use')
    },
    exportFormatNameLabel: function (): string {
      return trans('Format')
    },
    conversionLabel: function (): string {
      return trans('Conversion')
    },
    exportPatternLabel: function (): string {
      return trans('Add Glob patterns to include only specific files')
    },
    exportPatternNameLabel: function (): string {
      return trans('Glob Pattern')
    },
    projectBuildWarning: function (): string {
      return trans('Please select at least one profile to build this project.')
    },
    projectTitleLabel: function (): string {
      return trans('Project Title')
    },
    cslStyleLabel: function (): string {
      return trans('CSL Stylesheet')
    },
    texTemplateLabel: function (): string {
      return trans('LaTeX Template')
    },
    htmlTemplateLabel: function (): string {
      return trans('HTML Template')
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
        .then((descriptor: DirDescriptor) => {
          // Save the actually used formats.
          if (descriptor.settings.project !== null) {
            console.log(descriptor)
            this.selectedExportProfiles = descriptor.settings.project.profiles
            this.patterns = descriptor.settings.project.filters
            this.cslStyle = descriptor.settings.project.cslStyle
            this.htmlTemplate = descriptor.settings.project.templates.html
            this.texTemplate = descriptor.settings.project.templates.tex
            this.projectTitle = descriptor.settings.project.title
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
