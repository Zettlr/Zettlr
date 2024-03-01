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
        v-model="projectSettings.title"
        v-bind:label="projectTitleLabel"
      ></TextControl>

      <p v-if="projectSettings.profiles.length === 0" class="warning">
        <cds-icon shape="warning-standard"></cds-icon>
        <span>{{ projectBuildWarning }}</span>
      </p>
      <ListControl
        v-bind:label="exportFormatLabel"
        v-bind:value-type="'record'"
        v-bind:model-value="(exportFormatList as any[])"
        v-bind:column-labels="[exportFormatUseLabel, exportFormatNameLabel, conversionLabel]"
        v-bind:key-names="['selected', 'name', 'conversion']"
        v-bind:editable="[0]"
        v-bind:striped="true"
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
        v-model="projectSettings.filters"
        v-bind:value-type="'simpleArray'"
        v-bind:label="exportPatternLabel"
        v-bind:column-labels="[exportPatternNameLabel]"
        v-bind:editable="[0]"
        v-bind:addable="true"
        v-bind:deletable="true"
      ></ListControl>

      <!-- Then the CSL file -->
      <FileControl
        v-model="projectSettings.cslStyle"
        v-bind:label="cslStyleLabel"
        v-bind:reset="true"
        v-bind:filter="[{ extensions: ['csl'], name: 'CSL Stylesheet' }]"
      ></FileControl>
      <!-- Also, the other possible files users can override -->
      <FileControl
        v-model="projectSettings.templates.tex"
        v-bind:label="texTemplateLabel"
        v-bind:reset="true"
        v-bind:filter="[{ extensions: ['tex'], name: 'LaTeX Source' }]"
      ></FileControl>
      <FileControl
        v-model="projectSettings.templates.html"
        v-bind:label="htmlTemplateLabel"
        v-bind:reset="true"
        v-bind:filter="[{ extensions: [ 'html', 'htm' ], name: 'HTML Template' }]"
      ></FileControl>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
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
import WindowChrome from '@common/vue/window/WindowChrome.vue'
import ListControl from '@common/vue/form/elements/ListControl.vue'
import FileControl from '@common/vue/form/elements/FileControl.vue'
import TextControl from '@common/vue/form/elements/TextControl.vue'
import { ref, computed, watch } from 'vue'
import { type ProjectSettings, type DirDescriptor } from '@dts/common/fsal'
import { type PandocProfileMetadata } from '@providers/assets'
import { PANDOC_READERS, PANDOC_WRITERS, SUPPORTED_READERS } from '@common/util/pandoc-maps'
import getPlainPandocReaderWriter from '@common/util/plain-pandoc-reader-writer'
import { type WindowTab } from '@common/vue/window/WindowTabbar.vue'

const ipcRenderer = window.ipc

interface ExportProfile { selected: boolean, name: string, conversion: string }
interface CustomCommand { displayName: string, command: string }

const exportFormatLabel = trans('Export project to:')
const exportFormatUseLabel = trans('Use')
const exportFormatNameLabel = trans('Format')
const conversionLabel = trans('Conversion')
const exportPatternLabel = trans('Add Glob patterns to include only specific files')
const exportPatternNameLabel = trans('Glob Pattern')
const projectBuildWarning = trans('Please select at least one profile to build this project.')
const projectTitleLabel = trans('Project Title')
const cslStyleLabel = trans('CSL Stylesheet')
const texTemplateLabel = trans('LaTeX Template')
const htmlTemplateLabel = trans('HTML Template')

const tabs: WindowTab[] = [
  {
    id: 'formats-control',
    label: trans('General'),
    icon: 'cog',
    controls: 'formats-panel'
  },
  {
    id: 'files-control',
    label: 'Files',
    icon: 'file-settings',
    controls: 'formats-panel'
  }
]

const searchParams = new URLSearchParams(window.location.search)
const dirPath = searchParams.get('directory') ?? ''

const updateLock = ref(true) // To ensure these defaults aren't written before the properties have been loaded
const profiles = ref<PandocProfileMetadata[]>([])
const customCommands: CustomCommand[] = window.config.get('export.customCommands')

const projectSettings = ref<ProjectSettings>({
  title: '',
  profiles: [],
  filters: [],
  cslStyle: '',
  templates: { tex: '', html: '' }
})

const currentTab = ref(0)

const windowTitle = computed(() => projectSettings.value.title)

const exportFormatList = computed<ExportProfile[]>(() => {
  // We need to return a list of { selected: boolean, name: string, conversion: string }
  return profiles.value.filter(e => {
    return SUPPORTED_READERS.includes(getPlainPandocReaderWriter(e.reader))
  }).map(e => {
    const plainReader = getPlainPandocReaderWriter(e.reader)
    const plainWriter = getPlainPandocReaderWriter(e.writer)

    const hasReaderExtensions = plainReader !== e.reader
    const hasWriterExtensions = plainWriter !== e.writer

    const reader = plainReader in PANDOC_READERS ? PANDOC_READERS[plainReader] : plainReader
    const writer = plainWriter in PANDOC_WRITERS ? PANDOC_WRITERS[plainWriter] : plainWriter

    const readerFull = hasReaderExtensions ? reader + ` (${e.reader})` : reader
    const writerFull = hasWriterExtensions ? writer + ` (${e.writer})` : writer

    const conversionString = (e.isInvalid) ? 'Invalid' : [ readerFull, writerFull ].join(' → ')

    return {
      selected: projectSettings.value.profiles.includes(e.name),
      name: getDisplayText(e.name),
      conversion: conversionString
    }
  }).concat(
    customCommands.map(c => {
      return {
        selected: projectSettings.value.profiles.includes(c.command),
        name: c.displayName,
        conversion: c.command
      }
    })
  )
})

watch(projectSettings, updateProperties, { deep: true })

// First, we need to get the available export formats
ipcRenderer.invoke('assets-provider', { command: 'list-export-profiles' })
  .then((defaults: PandocProfileMetadata[]) => {
    profiles.value = defaults
  })
  .catch(err => console.error(err))

// On startup, fetch the properties immediately
fetchProperties()

function selectExportProfile (newListVal: ExportProfile[]): void {
  console.log(newListVal)
  const newProfiles = newListVal
    .filter(e => e.selected)
    .map(e => {
      return profiles.value.find(x => getDisplayText(x.name) === e.name) ?? customCommands.find(c => c.displayName === e.name)
    })
    .filter(x => x !== undefined) as Array<PandocProfileMetadata|CustomCommand>

  projectSettings.value.profiles = newProfiles.map(x => {
    return ('name' in x) ? x.name : x.command
  })
}

function getDisplayText (name: string): string {
  return name.substring(0, name.lastIndexOf('.'))
}

function updateProperties (): void {
  if (updateLock.value) {
    return
  }

  updateLock.value = true

  ipcRenderer.invoke('application', {
    command: 'get-descriptor',
    payload: dirPath
  })
    .then(descriptor => {
      if (descriptor.settings.project == null) {
        throw new Error('Could not update project settings: Project was null!')
      }

      const deproxiedSettings = JSON.parse(JSON.stringify(projectSettings.value))

      ipcRenderer.invoke('application', {
        command: 'update-project-properties',
        payload: { properties: deproxiedSettings, path: dirPath }
      })
        .finally(() => {
          updateLock.value = false
        })
        .catch(err => console.error(err))
    })
    .catch(err => console.error(err))
}

function fetchProperties (): void {
  ipcRenderer.invoke('application', {
    command: 'get-descriptor',
    payload: dirPath
  })
    .then((descriptor: DirDescriptor) => {
      // Save the actually used formats.
      if (descriptor.settings.project !== null) {
        projectSettings.value = descriptor.settings.project
      } else {
        // Apparently the user kept the window open and removed the project
        // state on this project. So let's close this window silently.
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
      updateLock.value = false // Now the properties are fetched, so the
      // handlers can overwrite them.
    })
    .catch(err => console.error(err))
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
