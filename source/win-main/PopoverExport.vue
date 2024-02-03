<template>
  <PopoverWrapper v-bind:target="target" v-on:close="$emit('close')">
    <h4>Export</h4>
    <p><strong>{{ filename }}</strong></p>
    <SelectControl
      v-model="format"
      v-bind:label="'Format'"
      v-bind:options="availableFormats"
    ></SelectControl>
    <!-- The choice of working directory vs. temporary applies to all exporters -->
    <hr>
    <RadioControl
      v-model="exportDirectory"
      v-bind:options="{
        'temp': 'Temporary directory',
        'cwd': 'Current directory',
        'ask': 'Select directory'
      }"
    ></RadioControl>
    <!-- Add the exporting button -->
    <button v-bind:disabled="isExporting" v-on:click="doExport">
      {{ exportButtonLabel }}
    </button>
  </PopoverWrapper>
</template>

<script lang="ts">
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

import PopoverWrapper from './PopoverWrapper.vue'
import RadioControl from '@common/vue/form/elements/RadioControl.vue'
import SelectControl from '@common/vue/form/elements/SelectControl.vue'
import { defineComponent } from 'vue'
import { type PandocProfileMetadata } from '@dts/common/assets'
import { SUPPORTED_READERS } from '@common/util/pandoc-maps'
import getPlainPandocReaderWriter from '@common/util/plain-pandoc-reader-writer'
import { trans } from '@common/i18n-renderer'
import { pathBasename } from '@common/util/renderer-path-polyfill'

const ipcRenderer = window.ipc
const config = window.config

export default defineComponent({
  name: 'PopoverExport',
  components: {
    SelectControl,
    RadioControl,
    PopoverWrapper
  },
  props: {
    target: {
      type: HTMLElement,
      required: true
    },
    filePath: {
      type: String,
      default: ''
    }
  },
  data: function () {
    return {
      closePopover: false,
      isExporting: false,
      format: '',
      exportDirectory: 'temp',
      profileMetadata: [] as PandocProfileMetadata[],
      customCommands: window.config.get('export.customCommands') as Array<{ displayName: string, command: string }>
    }
  },
  computed: {
    exportButtonLabel (): string {
      return this.isExporting ? trans('Exporting…') : trans('Export')
    },
    filename (): string {
      return pathBasename(this.filePath)
    },
    popoverData: function (): any {
      return {
        closePopover: this.closePopover
      }
    },
    availableFormats: function () {
      const selectOptions: Record<string, string> = {}

      this.profileMetadata
        // Remove files that cannot read any of Zettlr's internal formats ...
        .filter(e => {
          return SUPPORTED_READERS.includes(getPlainPandocReaderWriter(e.reader))
        })
        // ... and add the others to the available options
        .forEach(elem => { selectOptions[elem.name] = this.getDisplayText(elem) })

      const cmdTitle = trans('command')
      for (const command of this.customCommands) {
        selectOptions[command.command] = `${command.displayName} (${cmdTitle})`
      }

      return selectOptions
    }
  },
  watch: {
    exportDirectory: function () {
      // This watcher allows the user to set the export directory from here
      window.config.set('export.dir', this.exportDirectory)
    },
    format: function () {
      // Remember the last choice
      const prof = this.profileMetadata.find(e => e.name === this.format)
      const cmd = this.customCommands.find(x => x.command === this.format)
      config.set('export.singleFileLastExporter', (prof !== undefined) ? prof.name : (cmd !== undefined) ? cmd.command : '')
    }
  },
  created: function () {
    ipcRenderer.invoke('assets-provider', { command: 'list-export-profiles' })
      .then((defaults: PandocProfileMetadata[]) => {
        // Save all the exporter information into the array. The computed
        // properties will take the info from that array and re-compute based
        // on the value of "format".
        this.profileMetadata = defaults
        // Get either the last used exporter OR the first element available
        const lastProfile: string = config.get('export.singleFileLastExporter')
        const lastIdx = this.profileMetadata.findIndex(e => e.name === lastProfile)
        if (lastIdx < 0) {
          this.format = this.profileMetadata[0].name
        } else {
          this.format = this.profileMetadata[lastIdx].name
        }
      })
      .catch(err => console.error(err))

    // Preset the export directory
    this.exportDirectory = window.config.get('export.dir')
  },
  methods: {
    doExport: function () {
      const customCommand = this.customCommands.find(x => x.command === this.format)
      const profile = this.profileMetadata.find(e => e.name === this.format)
      this.isExporting = true

      if (customCommand !== undefined) {
        // Run the custom command exporter
        ipcRenderer.invoke('application', {
          command: 'custom-export',
          payload: {
            displayName: customCommand.displayName,
            file: this.filePath
          }
        })
          .finally(() => {
            this.isExporting = false
            this.closePopover = true
          })
          .catch(e => console.error(e))
      } else {
        // Run the regular exporter
        ipcRenderer.invoke('application', {
          command: 'export',
          payload: {
            profile: JSON.parse(JSON.stringify(profile)),
            exportTo: this.exportDirectory,
            file: this.filePath
          }
        })
          .finally(() => {
            this.isExporting = false
            this.closePopover = true
          })
          .catch(e => console.error(e))
      }
    },
    getDisplayText: function (item: PandocProfileMetadata): string {
      const name = item.name.substring(0, item.name.lastIndexOf('.'))
      return `${name} (${item.writer})`
    }
  }
})
</script>

<style lang="less">
//
</style>
@common/util/renderer-path-polyfill
