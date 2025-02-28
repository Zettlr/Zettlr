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

      <ZtrAdmonition v-if="projectSettings.profiles.length === 0" style="margin: 10px 0">
        {{ projectBuildWarning }}
      </ZtrAdmonition>

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
      <!-- First, the files to be included in the export -->
      <p>{{ exportFilesLabel }}</p>

      <div v-if="missingFiles.length > 0" class="export-file-list">
        <ZtrAdmonition>{{ missingFilesMessage }}</ZtrAdmonition>
        <div v-for="file in missingFiles" v-bind:key="file" class="export-file-item">
          <button
            class="remove-button"
            v-bind:aria-label="removeButtonTitle"
            v-bind:title="removeButtonTitle"
            v-on:click="removeFileFromExportList(file)"
          >
            &nbsp;&ndash;&nbsp;
          </button>
          <span>
            {{ file }}
          </span>
        </div>
      </div>

      <ZtrAdmonition v-if="projectSettings.files.length === 0" style="margin: 10px 0">
        {{ noFilesSelectedMessage }}
      </ZtrAdmonition>

      <div class="export-file-list">
        <div v-for="(file, i) in exportFileList" v-bind:key="file.displayName" v-bind:class="{ 'export-file-item': true, active: file.included }">
          <div class="actions">
            <template v-if="file.included">
              <button
                class="remove-button"
                v-bind:aria-label="removeButtonTitle"
                v-bind:title="removeButtonTitle"
                v-on:click="removeFileFromExportList(file.relativePath)"
              >
                &nbsp;&ndash;&nbsp;
              </button>
              <button
                v-if="i > 0"
                class="up-button"
                v-bind:aria-label="upButtonTitle"
                v-bind:title="upButtonTitle"
                v-on:click="moveFileUpInExportList(file.relativePath)"
              >
                &nbsp;&uarr;&nbsp;
              </button>
              <button
                v-if="i < projectSettings.files.length - 1"
                class="down-button"
                v-bind:aria-label="downButtonTitle"
                v-bind:title="downButtonTitle"
                v-on:click="moveFileDownInExportList(file.relativePath)"
              >
                &nbsp;&darr;&nbsp;
              </button>
            </template>
            <button
              v-else
              class="add-button"
              v-bind:aria-label="addButtonTitle"
              v-bind:title="addButtonTitle"
              v-on:click="addFileToExportList(file.relativePath)"
            >
              &nbsp;+&nbsp;
            </button>
          </div>
          <div class="display-name">
            <span>
              {{ file.displayName }}
            </span>
            <span class="relative-dirname">
              {{ file.relativePath }}
            </span>
          </div>
        </div>
      </div>

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
import ZtrAdmonition from '@common/vue/ZtrAdmonition.vue'
import { ref, computed, watch } from 'vue'
import type { ProjectSettings, DirDescriptor, AnyDescriptor, MDFileDescriptor, CodeFileDescriptor } from '@dts/common/fsal'
import type { AssetsProviderIPCAPI, PandocProfileMetadata } from '@providers/assets'
import { PANDOC_READERS, PANDOC_WRITERS, SUPPORTED_READERS } from '@common/pandoc-util/pandoc-maps'
import { type WindowTab } from '@common/vue/window/WindowTabbar.vue'
import { useConfigStore } from 'source/pinia'
import objectToArray from 'source/common/util/object-to-array'
import { pathBasename } from 'source/common/util/renderer-path-polyfill'
import { pathToUnix } from 'source/common/util/path-to-unix'
import { parseReaderWriter } from 'source/common/pandoc-util/parse-reader-writer'

const ipcRenderer = window.ipc

interface ExportProfile { selected: boolean, name: string, conversion: string }
interface CustomCommand { displayName: string, command: string }

const exportFormatLabel = trans('Export project to:')
const exportFormatUseLabel = trans('Use')
const exportFormatNameLabel = trans('Format')
const conversionLabel = trans('Conversion')
const exportFilesLabel = trans('Files to be included in the export')
const projectBuildWarning = trans('Please select at least one profile to build this project.')
const projectTitleLabel = trans('Project Title')
const cslStyleLabel = trans('CSL Stylesheet')
const texTemplateLabel = trans('LaTeX Template')
const htmlTemplateLabel = trans('HTML Template')
const removeButtonTitle = trans('Remove file from export')
const addButtonTitle = trans('Add file to export')
const upButtonTitle = trans('Move file up')
const downButtonTitle = trans('Move file down')
const noFilesSelectedMessage = trans('You have not selected any files for export.')
const missingFilesMessage = trans('Some files are selected for export but no longer exist in the directory.')

const configStore = useConfigStore()
const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))

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
const customCommands = configStore.config.export.customCommands

const projectSettings = ref<ProjectSettings>({
  title: '',
  profiles: [],
  files: [],
  cslStyle: '',
  templates: { tex: '', html: '' }
})

// Holds all available files inside the directory
const availableFiles = ref<Array<MDFileDescriptor|CodeFileDescriptor>>([])

// Returns a list of all files, prepared for enabling the user to add/remove
// files from the export list
const exportFileList = computed(() => {
  const files: Array<{ displayName: string, included: boolean, relativePath: string }> = []
  const projectFiles = projectSettings.value.files

  for (const file of availableFiles.value) {
    let basename = pathBasename(file.path)
    if (file.type === 'file') {
      if (useTitle.value && file.yamlTitle !== undefined) {
        basename = file.yamlTitle
      } else if (useH1.value && file.firstHeading !== null) {
        basename = file.firstHeading
      }
    }

    // The app always defaults to the Unix path conventions (/ instead of \\)
    const relativePath = pathToUnix(file.path.slice(dirPath.length + 1))
    files.push({
      // NOTE: We must map the files to the relative paths from the directory!
      relativePath,
      displayName: basename,
      included: projectFiles.includes(relativePath)
    })
  }

  files.sort((a, b) => {
    // Negative if a < b
    const aIdx = projectFiles.indexOf(a.relativePath)
    const bIdx = projectFiles.indexOf(b.relativePath)

    if (aIdx === bIdx) {
      return 0 // Both are -1
    } else if (aIdx < 0 && bIdx > -1) {
      return 1
    } else if (bIdx < 0 && aIdx > -1) {
      return -1
    } else {
      // Calculate from the indices
      return aIdx - bIdx
    }
  })

  return files
})

// Holds a list of files that are selected for export, but seem to be no longer
// present in the project directory.
const missingFiles = computed(() => {
  const missing: string[] = []
  const availablePaths = availableFiles.value.map(x => pathToUnix(x.path.slice(dirPath.length + 1)))

  for (const file of projectSettings.value.files) {
    if (!availablePaths.includes(file)) {
      // This will be passed into "remove" so it needs to be the same as in the original array
      missing.push(file)
    }
  }
  return missing
})

const currentTab = ref(0)

const windowTitle = computed(() => projectSettings.value.title)

const exportFormatList = computed<ExportProfile[]>(() => {
  // We need to return a list of { selected: boolean, name: string, conversion: string }
  return profiles.value.filter(e => {
    return SUPPORTED_READERS.includes(parseReaderWriter(e.reader).name)
  }).map(e => {
    const plainReader = parseReaderWriter(e.reader).name
    const plainWriter = parseReaderWriter(e.writer).name

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
ipcRenderer.invoke('assets-provider', { command: 'list-export-profiles' } as AssetsProviderIPCAPI)
  .then((defaults: PandocProfileMetadata[]) => {
    profiles.value = defaults
  })
  .catch(err => console.error(err))

// On startup, fetch the properties immediately
fetchProperties()

function selectExportProfile (newListVal: ExportProfile[]): void {
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
        availableFiles.value = objectToArray<AnyDescriptor>(descriptor, 'children').filter(e => [ 'code', 'file' ].includes(e.type)) as Array<CodeFileDescriptor|MDFileDescriptor>
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

/**
 * Adds the provided file to the list of to-be-exported files in this project.
 *
 * @param   {string}  relativeFilePath  The file path to add
 */
function addFileToExportList (relativeFilePath: string): void {
  if (projectSettings.value.files.includes(relativeFilePath)) {
    return
  }

  // Will automagically update
  projectSettings.value.files.push(relativeFilePath)
}

/**
 * Removes the provided file from the list of to-be-exported files in this
 * project.
 *
 * @param   {string}  relativeFilePath  The file path to remove
 */
function removeFileFromExportList (relativeFilePath: string): void {
  if (!projectSettings.value.files.includes(relativeFilePath)) {
    return
  }

  const idx = projectSettings.value.files.indexOf(relativeFilePath)
  projectSettings.value.files.splice(idx, 1)
}

/**
 * Moves the provided file down in the list of to-be-exported files in this
 * project.
 *
 * @param   {string}  relativeFilePath  The file path to move
 */
function moveFileDownInExportList (relativeFilePath: string): void {
  if (!projectSettings.value.files.includes(relativeFilePath)) {
    return
  }

  const idx = projectSettings.value.files.indexOf(relativeFilePath)
  if (idx === projectSettings.value.files.length - 1) {
    return
  }

  projectSettings.value.files.splice(idx, 1)
  projectSettings.value.files.splice(idx + 1, 0, relativeFilePath)
}

/**
 * Moves the provided file up in the list of to-be-exported files in this
 * project.
 *
 * @param   {string}  relativeFilePath  The file path to move
 */
function moveFileUpInExportList (relativeFilePath: string): void {
  if (!projectSettings.value.files.includes(relativeFilePath)) {
    return
  }

  const idx = projectSettings.value.files.indexOf(relativeFilePath)
  if (idx === 0) {
    return
  }

  projectSettings.value.files.splice(idx, 1)
  projectSettings.value.files.splice(idx - 1, 0, relativeFilePath)
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

.export-file-list {
  margin: 20px 0 40px 0;

  .export-file-item {
    padding: 5px;
    display: grid;
    grid-template-areas: "actions display-name";
    grid-template-columns: 50px auto;
    column-gap: 20px;

    .display-name {
      grid-area: display-name;
      display: flex;
      flex-direction: column;
      justify-content: center;

      .relative-dirname {
        font-size: 80%;
        color: #ccc;
      }
    }

    .actions {
      grid-area: actions;
      display: grid;
      grid-template-areas: "add-or-remove up-button"
      "add-or-remove down-button";
      grid-template-columns: 50% 50%;
      column-gap: 10px;
      align-items: center;
      justify-content: center;

      .up-button { grid-area: up-button; }
      .down-button { grid-area: down-button; }
      .add-button { grid-area: add-or-remove; }
      .remove-button { grid-area: add-or-remove; }
    }

    &:not(:last-child) {
      border-bottom: 1px solid #ccc;
    }

    &:not(.active) {
      color: #ccc;
    }
  }
}

body.dark .export-file-list {
  .export-file-item {
    .display-name .relative-dirname {
      color: #999;
    }

    &:not(.active) {
      color: #999;
    }

    &:not(:last-child) {
      border-bottom-color: #666;
    }
  }
}
</style>
