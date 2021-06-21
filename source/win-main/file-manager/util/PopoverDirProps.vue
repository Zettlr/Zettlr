<template>
  <div>
    <h4>{{ dirname }}</h4>
    <div class="properties-info-container">
      <div><span>Created: {{ creationTime }}</span></div>
      <div>
        <span>Files: {{ formattedFiles }}</span>
      </div>
    </div>
    <div class="properties-info-container">
      <div><span>Modified: {{ modificationTime }}</span></div>
      <div><span>Folders: {{ formattedDirs }}</span></div>
    </div>
    <hr>
    <!-- Sorting options -->
    <SelectControl
      v-model="sortingType"
      v-bind:inline="true"
      v-bind:options="{
        'name': 'Sort by name',
        'time': 'Sort by time'
      }"
    ></SelectControl>
    <SelectControl
      v-model="sortingDirection"
      v-bind:inline="true"
      v-bind:options="{
        'up': 'ascending',
        'down': 'descending'
      }"
    ></SelectControl>
    <hr>
    <!-- Project options -->
    <SwitchControl
      v-model="isProject"
      v-bind:label="'Enable Project'"
    ></SwitchControl>
    <div v-if="isProject" id="project-lists">
      <!-- TODO: Insert some generic project properties -->
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
    <hr style="clear: both;">
    <!-- Directory icon -->
    <div class="icon-selector">
      <div
        v-for="iconElement, idx in icons"
        v-bind:key="idx"
        v-bind:class="{ 'active': iconElement.shape === icon }"
        v-bind:title="iconElement.title"
        v-on:click="icon = iconElement.shape"
      >
        <clr-icon
          v-if="iconElement.shape !== null"
          v-bind:shape="iconElement.shape"
        ></clr-icon>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirProps Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a component to display and manage directory properties
 *
 * END HEADER
 */

import formatDate from '../../../common/util/format-date'
import localiseNumber from '../../../common/util/localise-number'
import SelectControl from '../../../common/vue/form/elements/Select'
import SwitchControl from '../../../common/vue/form/elements/Switch'
import ListControl from '../../../common/vue/form/elements/List'
import Vue from 'vue'

const ipcRenderer = window.ipc

const ICONS = [
  { shape: null, title: 'Reset' },
  { shape: 'cog', title: 'Cog' },
  { shape: 'cloud', title: 'Cloud' },
  { shape: 'check', title: 'Check' },
  { shape: 'times', title: 'Times' },
  { shape: 'help-info', title: 'Help' },
  { shape: 'info-standard', title: 'Info' },
  { shape: 'success-standard', title: 'Success' },
  { shape: 'error-standard', title: 'Error' },
  { shape: 'warning-standard', title: 'Warning' },
  { shape: 'bell', title: 'Bell' },
  { shape: 'user', title: 'Person' },
  { shape: 'users', title: 'People' },
  { shape: 'folder', title: 'Folder' },
  { shape: 'folder-open', title: 'Folder (open)' },
  { shape: 'image', title: 'Image' },
  { shape: 'eye', title: 'Eye' },
  { shape: 'eye-hide', title: 'Eye (crossed)' },
  { shape: 'calendar', title: 'Calendar' },
  { shape: 'calculator', title: 'Calculator' },
  { shape: 'store', title: 'Store' },
  { shape: 'shopping-bag', title: 'Shopping bag' },
  { shape: 'shopping-cart', title: 'Shopping cart' },
  { shape: 'factory', title: 'Factory' },
  { shape: 'heart', title: 'Heart' },
  { shape: 'heart-broken', title: 'Heart (broken)' },
  { shape: 'talk-bubbles', title: 'Bubbles' },
  { shape: 'chat-bubble', title: 'Bubble' },
  { shape: 'bubble-exclamation', title: 'Bubble (exclamation)' },
  { shape: 'color-palette', title: 'Colour Palette' },
  { shape: 'bars', title: 'Bars' },
  { shape: 'thermometer', title: 'Thermometer' },
  { shape: 'book', title: 'Book' },
  { shape: 'library', title: 'Library' },
  { shape: 'bug', title: 'Bug' },
  { shape: 'note', title: 'Note' },
  { shape: 'lightbulb', title: 'Lightbulb' },
  { shape: 'trash', title: 'Trash' },
  { shape: 'snowflake', title: 'Snowflake' },
  { shape: 'asterisk', title: 'Asterisk' },
  { shape: 'key', title: 'Key' },
  { shape: 'bolt', title: 'Bolt' },
  { shape: 'wrench', title: 'Wrench' },
  { shape: 'flame', title: 'Flame' },
  { shape: 'hourglass', title: 'Hourglass' },
  { shape: 'briefcase', title: 'Briefcase' },
  { shape: 'tools', title: 'Tools' },
  { shape: 'moon', title: 'Moon' },
  { shape: 'sun', title: 'Sun' },
  { shape: 'tree', title: 'Tree' },
  { shape: 'dot-circle', title: 'Circle (dot)' },
  { shape: 'circle', title: 'Circle' },
  { shape: 'video-camera', title: 'Video camera' },
  { shape: 'film-strip', title: 'Film strip' },
  { shape: 'microphone', title: 'Microphone' },
  { shape: 'crown', title: 'Crown' },
  { shape: 'star', title: 'Star' },
  { shape: 'flag', title: 'Flag' },
  { shape: 'envlope', title: 'Envelope' },
  { shape: 'airplane', title: 'Airplane' },
  { shape: 'happy-face', title: 'Happy emoji' },
  { shape: 'neutral-face', title: 'Neutral emoji' },
  { shape: 'sad-face', title: 'Sad emoji' },
  { shape: 'thumbs-up', title: 'Thumbs up' },
  { shape: 'thumbs-down', title: 'Thumbs down' },
  { shape: 'map', title: 'Map' },
  { shape: 'compass', title: 'Compass' },
  { shape: 'map-marker', title: 'Map marker' },
  { shape: 'flask', title: 'Flask' },
  { shape: 'cd-dvd', title: 'CD/DVD' }
]

export default {
  name: 'PopoverDirProps',
  components: {
    SelectControl,
    SwitchControl,
    ListControl
  },
  data: function () {
    return {
      dirname: '',
      creationtime: 0,
      modtime: 0,
      files: 0,
      dirs: 0,
      sortingType: 'name',
      sortingDirection: 'up',
      isProject: false,
      icon: null,
      exportFormatMap: {},
      selectedExportFormats: []
    }
  },
  computed: {
    // This property needs to be exposed on every Popover. The popover needs to
    // return the data that will then be reported back to the caller.
    popoverData: function () {
      return {
        sorting: `${this.sortingType}-${this.sortingDirection}`,
        isProject: this.isProject,
        exportFormats: this.selectedExportFormats,
        icon: this.icon
      }
    },
    creationTime: function () {
      return formatDate(new Date(this.creationtime), true)
    },
    modificationTime: function () {
      return formatDate(new Date(this.modtime), true)
    },
    formattedFiles: function () {
      return localiseNumber(this.files)
    },
    formattedDirs: function () {
      return localiseNumber(this.dirs)
    },
    icons: function () {
      return ICONS
    },
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
    ipcRenderer.invoke('application', {
      command: 'get-available-export-formats'
    })
      .then(exporterInformation => {
        // We only need to know the readable string for an exportable format
        // and the identifier. The list will be populated using the keys
        // (human-readable string), and the actual value will consist of the
        // values (the identifiers).
        for (const info of exporterInformation) {
          // NOTE: We are switching id: readable to readable: string here so
          // that it's much easier to retrieve the identifier later on.
          for (const key in info.formats) {
            Vue.set(this.exportFormatMap, info.formats[key], key)
          }
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
    }
  }
}
</script>

<style lang="less">
// Most styles are defined in the File popover
body .icon-selector {
  display: flex;
  flex-wrap: wrap;
  margin: 0 auto; // Center the div
  width: 200px; // Ten icons per row
  div {
    display: inline-block;
    padding: 2px; // The icons are 16x16px
    width: 20px;
    height: 20px;
  }
}

body.darwin {
  .icon-selector div {
    border-radius: 2px;
    &:hover { background-color: rgb(180, 180, 180); }
    &.active { background-color: var(--system-accent-color, --c-primary) }
  }

  &.dark .icon-selector div:hover {
    background-color: rgb(90, 90, 90);
  }
}

div#project-lists {
  display: flex;

  & > * { flex: 1; }
}
</style>
