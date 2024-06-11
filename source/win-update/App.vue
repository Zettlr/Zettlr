<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="false"
    v-bind:disable-vibrancy="!vibrancyEnabled"
  >
    <div id="update">
      <!-- First state: There is an error -->
      <template v-if="hasError">
        <div>{{ updateState.lastErrorCode }}: {{ updateState.lastErrorMessage }}</div>
        <!-- In case the user wants to retry -->
        <ButtonControl
          v-bind:label="checkForUpdateLabel"
          v-on:click="checkForUpdate"
        ></ButtonControl>
      </template>
      <!-- Second state: There is no new update -->
      <template v-else-if="!updateState.updateAvailable">
        <div>{{ noUpdateMessage }}</div>
        <div>{{ lastCheckedMessage }}</div>
        <ButtonControl
          v-bind:label="checkForUpdateLabel"
          v-on:click="checkForUpdate"
        ></ButtonControl>
      </template>
      <!-- Third state: An update is available -->
      <template v-else-if="updateState.updateAvailable">
        <h1>{{ updateTitle }}: {{ updateState.tagName }}</h1>
        <p>{{ updateCurrentVersion }}: {{ currentVersion }}</p>
        <!-- State 3.1: An update is available for download -->
        <template v-if="!isDownloading && !isFinished">
          <p>{{ updateNotification }}</p>
          <ButtonControl
            v-for="asset, idx in updateState.compatibleAssets"
            v-bind:key="idx"
            v-bind:label="'Download ' + asset.name"
            v-bind:inline="true"
            v-on:click="requestDownload(asset.browser_download_url)"
          >
          </ButtonControl>
          <!-- Provide default link if no compatible assets found -->
          <ButtonControl
            v-if="updateState.compatibleAssets.length === 0"
            v-bind:label="'Open Releases Page'"
            v-bind:inline="true"
            v-on:click="openReleasesPage"
          >
          </ButtonControl>
        </template>
        <!-- State 3.2: An update is currently downloading -->
        <template v-else-if="isDownloading && !isFinished">
          <p>{{ downloadProgressLabel }}: {{ formatSize(updateState.size_downloaded, true) }} of {{ formatSize(updateState.size_total, true) }} ({{ getETA }})</p>
          <ProgressControl
            v-bind:max="updateState.size_total"
            v-bind:value="updateState.size_downloaded"
          >
          </ProgressControl>
        </template>
        <!-- State 3.3: A downloaded update can be installed -->
        <template v-else>
          <ButtonControl
            v-bind:label="startButtonLabel"
            v-bind:disabled="disableStartButton"
            v-on:click="startUpdate()"
          >
          </ButtonControl>
        </template>
        <!-- If there's a new update, always display the changelog -->
        <hr>
        <div id="changelog" v-html="updateState.changelog"></div>
      </template>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Update
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The update window's entry component
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/WindowChrome.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import ProgressControl from '@common/vue/form/elements/ProgressControl.vue'
import { trans } from '@common/i18n-renderer'
import formatSize from '@common/util/format-size'
import PACKAGE_JSON from '../../package.json'
import { computed, onUnmounted, ref } from 'vue'
import { type UpdateState } from 'source/app/service-providers/updates'
import { DateTime } from 'luxon'
import { useConfigStore } from 'source/pinia'

const ipcRenderer = window.ipc

const configStore = useConfigStore()

const windowTitle = trans('Updater')
const updateTitle = trans('New update available')
const updateCurrentVersion = trans('Your version')
const updateNotification = trans('There is a new version of Zettlr available to download. Please read the changelog below.')
const downloadProgressLabel = trans('Downloading your update')
const noUpdateMessage = trans('No update available. You have the most recent version.')
const checkForUpdateLabel = trans('Check for updates')

const vibrancyEnabled = configStore.config.window.vibrancy
const currentVersion = PACKAGE_JSON.version

const startButtonLabel = ref(trans('Click to start update'))
const lastCheckedMessage = computed(() => {
  if (updateState.value.lastCheck === undefined) {
    return trans('Last checked: %s', trans('never'))
  } else {
    const dt = DateTime.fromMillis(updateState.value.lastCheck)
    return trans('Last checked: %s', dt.toRelative())
  }
})
const disableStartButton = ref(false) // True as soon as the update starts
const updateState = ref<UpdateState>({
  lastErrorMessage: undefined,
  lastErrorCode: undefined,
  updateAvailable: false,
  prerelease: false,
  changelog: '',
  tagName: '',
  releasePage: 'https://github.com/Zettlr/Zettlr/releases',
  compatibleAssets: [],
  name: '',
  full_path: '',
  size_total: 0,
  size_downloaded: 0,
  start_time: 0,
  eta_seconds: 0
})

const hasError = computed(() => {
  // Sometimes, "undefined" properties do not get transferred from main so
  // we additionally need to check for existence here, cf. #2775
  return 'lastErrorMessage' in updateState.value &&
    'lastErrorCode' in updateState.value &&
    updateState.value.lastErrorMessage !== undefined &&
    updateState.value.lastErrorCode !== undefined
})

const isDownloading = computed(() => {
  return updateState.value.size_downloaded > 0 && updateState.value.size_downloaded < updateState.value.size_total
})

const isFinished = computed(() => {
  return updateState.value.size_downloaded > 0 && updateState.value.size_downloaded === updateState.value.size_total
})

const getETA = computed(() => {
  const seconds = updateState.value.eta_seconds
  if (seconds > 60) {
    return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's'
  } else {
    return seconds + 's'
  }
})

// Immediately retrieve the current update status and set up a listener to
// retrieve any updates to the state.
ipcRenderer.invoke('update-provider', { command: 'update-status' })
  .then(newUpdateState => { updateState.value = newUpdateState })
  .catch(e => console.error(e))

// Whenever the update state changes in the provider, we must update it here
const offCallback = ipcRenderer.on('update-provider', (event, command, newUpdateState) => {
  if (command === 'state-changed') {
    if (newUpdateState !== undefined) {
      updateState.value = newUpdateState
    } else {
      console.error('ERROR: Expected an update state, received undefined!')
    }
  }
})

onUnmounted(offCallback)

function requestDownload (url: string): void {
  ipcRenderer.invoke('update-provider', {
    command: 'request-app-update',
    payload: url
  })
    .catch(e => console.error(e))
}

function startUpdate (): void {
  disableStartButton.value = true
  startButtonLabel.value = trans('Starting update …')
  ipcRenderer.invoke('update-provider', { command: 'begin-update' })
    .catch(e => {
      disableStartButton.value = false
      console.error(e)
    })
}

function checkForUpdate (): void {
  ipcRenderer.invoke('update-provider', { command: 'check-for-update' })
    .catch(e => console.error(e))
}

function openReleasesPage (): void {
  window.location.assign(updateState.value.releasePage)
}
</script>

<style lang="less">
body.darwin, body.win32, body.linux {
  #update {
    padding: 10px;

    p { margin: 10px 0px; }

    #changelog {
      padding: 10px;
      h1 { font-size: 110%; }
      h2 { font-size: 100%; }
      h3 { font-size: 80%; }
    }
  }
}

</style>
