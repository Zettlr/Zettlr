<template>
  <PopoverWrapper v-bind:target="target" v-on:close="$emit('close')">
    <div class="toolbar-export">
      <h3>Export</h3>
      <p><strong>{{ filename }}</strong></p>
      <SelectControl
        v-model="format"
        v-bind:label="formatLabel"
        v-bind:options="availableFormats"
      ></SelectControl>
      <!-- The choice of working directory vs. temporary applies to all exporters -->
      <hr>
      <RadioControl
        v-model="exportDirectory"
        v-bind:options="{
          'temp': tempDirLabel,
          'cwd': cwdLabel,
          'ask': askLabel
        }"
      ></RadioControl>
      <hr>
      <CheckboxControl
        v-model="autoOpenExport"
        v-bind:label="autoOpenLabel"
      ></CheckboxControl>
      <!-- Add the exporting button -->
      <button v-bind:disabled="isExporting" v-on:click="doExport">
        {{ exportButtonLabel }}
      </button>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Export Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file enables single-file exports for the user.
 *
 * END HEADER
 */

import PopoverWrapper from '@common/vue/PopoverWrapper.vue'
import RadioControl from '@common/vue/form/elements/RadioControl.vue'
import SelectControl from '@common/vue/form/elements/SelectControl.vue'
import CheckboxControl from '@common/vue/form/elements/CheckboxControl.vue'
import { ref, computed, watch } from 'vue'
import type { AssetsProviderIPCAPI, PandocProfileMetadata } from '@providers/assets'
import { SUPPORTED_READERS } from '@common/pandoc-util/pandoc-maps'
import { trans } from '@common/i18n-renderer'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import { useConfigStore } from 'source/pinia'
import { parseReaderWriter } from 'source/common/pandoc-util/parse-reader-writer'

const ipcRenderer = window.ipc

const formatLabel = trans('Format')
const autoOpenLabel = trans('Open after export')
const tempDirLabel = trans('Temporary directory')
const cwdLabel = trans('Current directory')
const askLabel = trans('Select directory')

// This is used to limit the number of selected
// profile to filename mappings in the config
const PREVIOUSLY_SELECTED_PROFILE_LIMIT = 50

ipcRenderer.invoke('assets-provider', { command: 'list-export-profiles' } as AssetsProviderIPCAPI)
  .then((defaults: PandocProfileMetadata[]) => {
    // Save all the exporter information into the array. The computed
    // properties will take the info from that array and re-compute based
    // on the value of "format".
    profileMetadata.value = defaults
    // Get either the last selected exporter for the open file,
    // the last used exporter, or the first element available
    const lastProfile = selectedProfiles.value.find(item => item.filePath === props.filePath)
    const profile = lastProfile ? lastProfile.profile : lastUsedProfile.value

    if (profile in availableFormats.value) {
      format.value = profile
    } else {
      format.value = profileMetadata.value[0].name
    }
  })
  .catch(err => console.error(err))

const configStore = useConfigStore()

const props = defineProps<{
  target: HTMLElement
  filePath: string
}>()

const emit = defineEmits<(e: 'close') => void>()

const isExporting = ref(false)
const format = ref('')
const exportDirectory = ref(configStore.config.export.dir)
const autoOpenExport = ref(configStore.config.export.autoOpenExportedFiles)
const profileMetadata = ref<PandocProfileMetadata[]>([])

const customCommands = computed(() => configStore.config.export.customCommands)
const selectedProfiles = computed(() => configStore.config.export.selectedProfiles)
const lastUsedProfile = computed(() => configStore.config.export.lastUsedProfile)

const exportButtonLabel = computed(() => isExporting.value ? trans('Exporting…') : trans('Export'))
const filename = computed(() => pathBasename(props.filePath))
const availableFormats = computed(() => {
  const selectOptions: Record<string, string> = {}

  profileMetadata.value
    // Remove files that cannot read any of Zettlr's internal formats ...
    .filter(e => {
      return SUPPORTED_READERS.includes(parseReaderWriter(e.reader).name)
    })
    // ... and add the others to the available options
    .forEach(elem => { selectOptions[elem.name] = getDisplayText(elem) })

  const cmdTitle = trans('command')
  for (const command of customCommands.value) {
    selectOptions[command.command] = `${command.displayName} (${cmdTitle})`
  }

  return selectOptions
})

watch(autoOpenExport, function (value) {
  // This watcher allows the user to control whether
  // the exported document is automatically opened
  configStore.setConfigValue('export.autoOpenExportedFiles', value)
})

watch(exportDirectory, function (value) {
  // This watcher allows the user to set the export directory from here
  configStore.setConfigValue('export.dir', value)
})

watch(format, function (value) {
  // Remember the last choice
  const prof = profileMetadata.value.find(e => e.name === value)
  const cmd = customCommands.value.find(x => x.command === value)

  const profile: string  = prof?.name ?? cmd?.command ?? lastUsedProfile.value
  const filePath: string = props.filePath

  const newProfiles = selectedProfiles.value
    // Remove any previous items with the same path
    .filter(item  => item.filePath !== filePath)
    // Clamp the list to the last N - 1 items since we will be pushing one
    .slice(-PREVIOUSLY_SELECTED_PROFILE_LIMIT - 1)

  newProfiles.push({ filePath, profile })

  configStore.setConfigValue('export.selectedProfiles', JSON.parse(JSON.stringify(newProfiles)))
  configStore.setConfigValue('export.lastUsedProfile', profile)
})

function doExport (): void {
  const customCommand = customCommands.value.find(x => x.command === format.value)
  const profile = profileMetadata.value.find(e => e.name === format.value)
  isExporting.value = true

  if (customCommand !== undefined) {
    // Run the custom command exporter
    ipcRenderer.invoke('application', {
      command: 'custom-export',
      payload: {
        displayName: customCommand.displayName,
        file: props.filePath
      }
    })
      .finally(() => {
        isExporting.value = false
        emit('close')
      })
      .catch(e => console.error(e))
  } else {
    // Run the regular exporter
    ipcRenderer.invoke('application', {
      command: 'export',
      payload: {
        profile: JSON.parse(JSON.stringify(profile)),
        exportTo: exportDirectory.value,
        file: props.filePath
      }
    })
      .finally(() => {
        isExporting.value = false
        emit('close')
      })
      .catch(e => console.error(e))
  }
}

function getDisplayText (item: PandocProfileMetadata): string {
  const name = item.name.substring(0, item.name.lastIndexOf('.'))
  return `${name} (${item.writer})`
}
</script>

<style lang="less">
body {
  .toolbar-export {
    margin: 5px;

    h3, p, strong {
      text-align: center;
      padding-bottom: 5px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    button {
      width: stretch;
      margin: 5px;
    }

    .form-control {
      padding: 5px;
      select {
          margin-top: 5px;
        }
    }

    .radio-group-container {
      margin: 5px;
    }
  }
}
</style>
@common/util/renderer-path-polyfill
