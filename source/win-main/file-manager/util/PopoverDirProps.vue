<template>
  <div>
    <h4>{{ dirname }}</h4>
    <div class="properties-info-container">
      <div><span>{{ createdLabel }}: {{ creationTime }}</span></div>
      <div>
        <span>{{ filesLabel }}: {{ formattedFiles }}</span>
      </div>
    </div>
    <div class="properties-info-container">
      <div><span>{{ modifiedLabel }}: {{ modificationTime }}</span></div>
      <div><span>{{ foldersLabel }}: {{ formattedDirs }}</span></div>
    </div>
    <div class="properties-info-container">
      <div>
        <!--
          We display the outer div always as a placeholder to have the word
          count flush right, even if we don't have a git repository
        -->
        <span v-if="isGitRepository">
          <cds-icon shape="git"></cds-icon> Git Repository
        </span>
      </div>
      <div><span>{{ formattedWordCount }}</span></div>
    </div>
    <hr>
    <!-- Sorting options -->
    <SelectControl
      v-model="sortingType"
      v-bind:inline="true"
      v-bind:options="{
        name: 'Sort by name',
        time: 'Sort by time'
      }"
    ></SelectControl>
    <SelectControl
      v-model="sortingDirection"
      v-bind:inline="true"
      v-bind:options="{
        up: 'ascending',
        down: 'descending'
      }"
    ></SelectControl>
    <hr>
    <!-- Project options -->
    <SwitchControl
      v-model="isProject"
      v-bind:label="'Enable Project'"
    ></SwitchControl>
    <ButtonControl
      v-if="isProject"
      v-bind:label="projectPropertiesLabel"
      v-on:click="openProjectPreferences"
    ></ButtonControl>
    <hr style="clear: both;">
    <!-- Directory icon -->
    <div class="icon-selector">
      <div
        v-for="iconElement, idx in icons"
        v-bind:key="idx"
        v-bind:class="{ active: iconElement.shape === icon }"
        v-bind:title="iconElement.title"
        v-on:click="updateIcon(iconElement.shape)"
      >
        <cds-icon
          v-if="iconElement.shape !== null"
          v-bind:shape="iconElement.shape"
        ></cds-icon>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
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

import formatDate from '@common/util/format-date'
import localiseNumber from '@common/util/localise-number'
import SelectControl from '@common/vue/form/elements/Select.vue'
import SwitchControl from '@common/vue/form/elements/Switch.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import { trans } from '@common/i18n-renderer'
import { DirDescriptor, MDFileDescriptor } from '@dts/common/fsal'

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
  { shape: 'envelope', title: 'Envelope' },
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
    ButtonControl
  },
  props: {
    directoryPath: {
      type: String,
      default: ''
    }
  },
  data: function () {
    return {
      descriptor: undefined as DirDescriptor|undefined,
      sortingType: 'name',
      sortingDirection: 'up',
      isProject: false,
      closePopover: false // As soon as this is true, the dir popover wants to request a close command
    }
  },
  computed: {
    // This property needs to be exposed on every Popover. The popover needs to
    // return the data that will then be reported back to the caller.
    popoverData: function () {
      return {
        closePopover: this.closePopover
      }
    },
    dirname: function () {
      return this.descriptor?.name ?? ''
    },
    isGitRepository: function () {
      return this.descriptor?.isGitRepository ?? false
    },
    icon: function () {
      if (this.descriptor === undefined) {
        return null
      }

      return this.descriptor.settings.icon
    },
    children: function () {
      return this.descriptor?.children ?? []
    },
    creationTime: function () {
      return formatDate(new Date(this.descriptor?.creationtime ?? 0), window.config.get('appLang'), true)
    },
    modificationTime: function () {
      return formatDate(new Date(this.descriptor?.modtime ?? 0), window.config.get('appLang'), true)
    },
    formattedFiles: function () {
      return localiseNumber(this.children.filter(x => x.type !== 'directory').length)
    },
    formattedDirs: function () {
      return localiseNumber(this.children.filter(x => x.type === 'directory').length)
    },
    formattedWordCount: function () {
      if (this.descriptor === undefined) {
        return trans('%s words', 0)
      }

      const totalWords = this.descriptor.children
        .filter((x): x is MDFileDescriptor => x.type === 'file')
        .map(x => x.wordCount)
        .reduce((prev, cur) => { return prev + cur }, 0)

      return trans('%s words', localiseNumber(totalWords))
    },
    foldersLabel: function () {
      return trans('Directories')
    },
    modifiedLabel: function () {
      return trans('Modified')
    },
    createdLabel: function () {
      return trans('Created')
    },
    filesLabel: function () {
      return trans('Files')
    },
    icons: function () {
      return ICONS
    },
    projectPropertiesLabel: function () {
      return trans('Project Settings…')
    },
    descriptorIsProject () {
      if (this.descriptor === undefined) {
        return false
      } else {
        return this.descriptor.settings.project !== null
      }
    }
  },
  watch: {
    sortingType () {
      this.updateSorting()
    },
    sortingDirection () {
      this.updateSorting()
    },
    isProject () {
      this.updateProject()
    }
  },
  created: async function () {
    await this.fetchDescriptor()
  },
  methods: {
    async fetchDescriptor () {
      const descriptor: DirDescriptor|undefined = await ipcRenderer.invoke('application', {
        command: 'get-descriptor',
        payload: this.directoryPath
      })

      if (descriptor === undefined) {
        console.error('Could not open directory properties: Not found')
        this.closePopover = true
        return
      }

      this.descriptor = descriptor

      this.isProject = this.descriptor.settings.project !== null

      ;[
        this.sortingType,
        this.sortingDirection
      ] = this.descriptor.settings.sorting.split('-')
    },
    openProjectPreferences: function () {
      ipcRenderer.invoke('application', {
        command: 'open-project-preferences',
        payload: this.directoryPath
      })
        .catch(err => console.error(err))

      this.closePopover = true
    },
    updateIcon (iconShape: string|null) {
      ipcRenderer.invoke('application', {
        command: 'dir-set-icon',
        payload: {
          path: this.directoryPath,
          icon: iconShape
        }
      })
        .then(() => {
          this.fetchDescriptor().catch(e => console.error(e))
        })
        .catch(e => console.error(e))
    },
    updateSorting () {
      ipcRenderer.invoke('application', {
        command: 'dir-sort',
        payload: {
          path: this.directoryPath,
          sorting: `${this.sortingType}-${this.sortingDirection}`
        }
      })
        .then(() => {
          this.fetchDescriptor().catch(e => console.error(e))
        })
        .catch(e => console.error(e))
    },
    updateProject () {
      if (this.isProject === this.descriptorIsProject) {
        return
      }

      // NOTE: The toggle describes *wanted* behavior
      if (this.isProject) {
        ipcRenderer.invoke('application', {
          command: 'dir-new-project',
          payload: { path: this.directoryPath }
        })
          .then(() => {
            this.fetchDescriptor().catch(e => console.error(e))
          })
          .catch(e => console.error(e))
      } else {
        ipcRenderer.invoke('application', {
          command: 'dir-remove-project',
          payload: { path: this.directoryPath }
        })
          .then(() => {
            this.fetchDescriptor().catch(e => console.error(e))
          })
          .catch(e => console.error(e))
      }
    }
  }
}
</script>

<style lang="less">
// Most styles are defined in the File popover
body {
  .icon-selector {
    display: flex;
    flex-wrap: wrap;
    margin: 0 auto; // Center the div
    width: 200px; // Ten icons per row
    div {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 20px;
      height: 20px;
      &:hover, &.active { background-color: rgb(180, 180, 180); }
    }
  }

  &.dark .icon-selector div:hover, &.dark .icon-selector div.active {
    background-color: rgb(90, 90, 90);
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
</style>
