<template>
  <PopoverWrapper v-bind:target="target" v-on:close="emit('close')">
    <h4>{{ props.directory.name }}</h4>
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
        <span v-if="props.directory.isGitRepository">
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
        v-bind:class="{
          active: iconElement.shape === props.directory.settings.icon
        }"
        v-bind:title="iconElement.title"
        v-on:click="updateIcon(iconElement.shape)"
      >
        <cds-icon
          v-if="iconElement.shape !== null"
          v-bind:shape="iconElement.shape"
        ></cds-icon>
      </div>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
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
import PopoverWrapper from 'source/win-main/PopoverWrapper.vue'
import SelectControl from '@common/vue/form/elements/SelectControl.vue'
import SwitchControl from '@common/vue/form/elements/SwitchControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import { trans } from '@common/i18n-renderer'
import { type DirDescriptor, type MDFileDescriptor } from '@dts/common/fsal'
import { ref, computed, watch, toRef, onBeforeMount } from 'vue'
import { useConfigStore } from 'source/pinia'

const ipcRenderer = window.ipc

const foldersLabel = trans('Directories')
const modifiedLabel = trans('Modified')
const createdLabel = trans('Created')
const filesLabel = trans('Files')
const projectPropertiesLabel = trans('Project Settings…')

const icons = [
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

const configStore = useConfigStore()

const props = defineProps<{ target: HTMLElement, directory: DirDescriptor }>()

const emit = defineEmits<(e: 'close') => void>()

const sortingType = ref<'name'|'time'>('name')
const sortingDirection = ref<'up'|'down'>('up')
const isProject = ref<boolean>(false)

const creationTime = computed(() => {
  return formatDate(new Date(props.directory.creationtime), configStore.config.appLang, true)
})

const modificationTime = computed(() => {
  return formatDate(new Date(props.directory.modtime), configStore.config.appLang, true)
})

const formattedFiles = computed(() => {
  return localiseNumber(props.directory.children.filter(x => x.type !== 'directory').length)
})

const formattedDirs = computed(() => {
  return localiseNumber(props.directory.children.filter(x => x.type === 'directory').length)
})

const formattedWordCount = computed(() => {
  const totalWords = props.directory.children
    .filter((x): x is MDFileDescriptor => x.type === 'file')
    .map(x => x.wordCount)
    .reduce((prev, cur) => { return prev + cur }, 0)

  return trans('%s words', localiseNumber(totalWords))
})

watch(sortingType, updateSorting)
watch(sortingDirection, updateSorting)
watch(isProject, updateProject)
watch(toRef(props, 'directory'), setSorting)

onBeforeMount(setSorting)

/**
 * Presets the sorting value with the sorting of the directory descriptor prop.
 */
function setSorting (): void {
  const [ type, direction ] = props.directory.settings.sorting.split('-') as ['name'|'time', 'up'|'down']
  sortingType.value = type
  sortingDirection.value = direction
}

function openProjectPreferences (): void {
  ipcRenderer.invoke('application', {
    command: 'open-project-preferences',
    payload: props.directory.path
  })
    .catch(err => console.error(err))
  emit('close')
}

function updateIcon (iconShape: string|null): void {
  ipcRenderer.invoke('application', {
    command: 'dir-set-icon',
    payload: {
      path: props.directory.path,
      icon: iconShape
    }
  })
    .catch(e => console.error(e))
}

function updateSorting (): void {
  ipcRenderer.invoke('application', {
    command: 'dir-sort',
    payload: {
      path: props.directory.path,
      sorting: `${sortingType.value}-${sortingDirection.value}`
    }
  })
    .catch(e => console.error(e))
}

function updateProject (): void {
  const hasProject = props.directory.settings.project !== null
  if (isProject.value === hasProject) {
    return
  }

  // NOTE: The toggle describes *wanted* behavior
  if (isProject.value) {
    ipcRenderer.invoke('application', {
      command: 'dir-new-project',
      payload: { path: props.directory.path }
    })
      .catch(e => console.error(e))
  } else {
    ipcRenderer.invoke('application', {
      command: 'dir-remove-project',
      payload: { path: props.directory.path }
    })
      .catch(e => console.error(e))
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
