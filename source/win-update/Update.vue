<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="false"
    v-bind:disable-vibrancy="false"
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
      <template v-else-if="!updateAvailable">
        <div>{{ noUpdateMessage }}</div>
        <ButtonControl
          v-bind:label="checkForUpdateLabel"
          v-on:click="checkForUpdate"
        ></ButtonControl>
      </template>
      <!-- Third state: An update is available -->
      <template v-else-if="updateAvailable">
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
          <p>{{ downloadProgressLabel }}: {{ formatSize(updateState.size_downloaded) }} of {{ formatSize(updateState.size_total) }} ({{ getETA }})</p>
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

<script>
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

import WindowChrome from '../common/vue/window/Chrome'
import ButtonControl from '../common/vue/form/elements/Button'
import ProgressControl from '../common/vue/form/elements/Progress'
import { trans } from '../common/i18n-renderer'
import formatSize from '../common/util/format-size'
import PACKAGE_JSON from '../../package.json'

const ipcRenderer = window.ipc

export default {
  name: 'Updater',
  components: {
    WindowChrome,
    ButtonControl,
    ProgressControl
  },
  data: function () {
    return {
      windowTitle: trans('dialog.update.window_title'),
      disableStartButton: false, // True as soon as the update starts
      startButtonLabel: trans('dialog.update.start_update_label'),
      updateState: {
        lastErrorMessage: undefined,
        lastErrorCode: undefined,
        updateAvailable: false,
        prerelease: false,
        changelog: '',
        tagName: '',
        compatibleAssets: [],
        name: '',
        full_path: '',
        size_total: 0,
        size_downloaded: 0,
        start_time: 0,
        eta_seconds: 0
      }
    }
  },
  computed: {
    hasError: function () {
      // Sometimes, "undefined" properties do not get transferred from main so
      // we additionally need to check for existence here, cf. #2775
      return 'lastErrorMessage' in this.updateState &&
        'lastErrorCode' in this.updateState &&
        this.updateState.lastErrorMessage !== undefined &&
        this.updateState.lastErrorCode !== undefined
    },
    updateAvailable: function () {
      return this.updateState.updateAvailable
    },
    isDownloading: function () {
      return this.updateState.size_downloaded > 0 && this.updateState.size_downloaded < this.updateState.size_total
    },
    isFinished: function () {
      return this.updateState.size_downloaded > 0 && this.updateState.size_downloaded === this.updateState.size_total
    },
    updateTitle: function () {
      return trans('dialog.update.title')
    },
    updateCurrentVersion: function () {
      return trans('dialog.update.current_version')
    },
    updateNotification: function () {
      return trans('dialog.update.notification')
    },
    downloadProgressLabel: function () {
      return trans('dialog.update.download_progress_label')
    },
    noUpdateMessage: function () {
      return trans('dialog.update.no_new_update')
    },
    currentVersion: function () {
      return PACKAGE_JSON.version
    },
    checkForUpdateLabel: function () {
      return trans('menu.update')
    },
    getETA: function () {
      let seconds = this.updateState.eta_seconds
      if (seconds > 60) {
        return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's'
      } else {
        return seconds + 's'
      }
    }
  },
  created: function () {
    // Immediately retrieve the current update status and set up a listener to
    // retrieve any updates to the state.
    ipcRenderer.invoke('update-provider', { command: 'update-status' })
      .then(updateState => { this.updateState = updateState })
      .catch(e => console.error(e))

    // Whenever the update state changes in the provider, we must update it here
    ipcRenderer.on('update-provider', (event, command, updateState) => {
      if (command === 'state-changed') {
        if (updateState !== undefined) {
          this.updateState = updateState
        } else {
          console.error('ERROR: Expected an update state, received undefined!')
        }
      }
    })
  },
  methods: {
    requestDownload: function (url) {
      ipcRenderer.invoke('update-provider', {
        command: 'request-app-update',
        payload: url
      })
        .catch(e => console.error(e))
    },
    startUpdate: function () {
      this.disableStartButton = true
      this.startButtonLabel = trans('dialog.update.start_update_message')
      ipcRenderer.invoke('update-provider', { command: 'begin-update' })
        .catch(e => {
          this.disableStartButton = false
          console.error(e)
        })
    },
    formatSize: function (bytes) {
      return formatSize(bytes, true)
    },
    checkForUpdate: function () {
      ipcRenderer.invoke('update-provider', { command: 'check-for-update' })
        .catch(e => console.error(e))
    },
    openReleasesPage: function () {
      window.location.assign(this.updateState.releasePage)
    }
  }
}
</script>

<style lang="less">
body.darwin {
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
