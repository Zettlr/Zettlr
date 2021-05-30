<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="false"
    v-bind:disable-vibrancy="false"
  >
    <div id="update">
      <template v-if="updateAvailable">
        <h1>{{ updateTitle }}: {{ lastResponse.newVer }}</h1>
        <p>{{ updateCurrentVersion }}: {{ lastResponse.curVer }}</p>
        <template v-if="!isDownloading && !isFinished">
          <!-- No download has been initiated and nothing has been downloaded -->
          <!-- Show the available download options -->
          <p>{{ updateNotification }}</p>
          <ButtonControl
            v-for="asset, idx in lastResponse.assets"
            v-bind:key="idx"
            v-bind:label="asset.name"
            v-bind:inline="true"
            v-on:click="requestDownload(asset.browser_download_url)"
          >
          </ButtonControl>
        </template>
        <template v-else-if="isDownloading && !isFinished">
          <!-- We are currently downloading an update -->
          <p>Downloading your update: {{ downloadProgress.download_percent }} % ({{ getETA }})</p>
          <ProgressControl
            v-bind:max="downloadProgress.size_total"
            v-bind:value="downloadProgress.size_downloaded"
          >
          </ProgressControl>
        </template>
        <template v-else>
          <!-- There is a downloaded update available to install -->
          <ButtonControl
            v-bind:label="startButtonLabel"
            v-bind:disabled="disableStartButton"
            v-on:click="startUpdate()"
          >
          </ButtonControl>
        </template>
        <hr>
        <div id="changelog" v-html="lastResponse.changelog"></div>
      </template>
      <template v-else>
        No update available. You have the most recent version installed.
      </template>
    </div>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
import ButtonControl from '../common/vue/form/elements/Button'
import ProgressControl from '../common/vue/form/elements/Progress'
import { trans } from '../common/i18n-renderer'

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
      windowTitle: 'Updater', // TODO: Translate
      lastResponse: null, // Type: ParsedAPIResponse
      disableStartButton: false, // True as soon as the update starts
      startButtonLabel: 'Click to start update', // The initial label of the start button TODO: Translate
      downloadProgress: {
        name: '',
        full_path: '',
        size_total: 0,
        size_downloaded: 0,
        start_time: 0,
        eta_seconds: 0,
        download_percent: 0,
        finished: false,
        isCurrentlyDownloading: false
      } // Type: UpdateDownloadProgress
    }
  },
  computed: {
    updateAvailable: function () {
      if (this.lastResponse == null) {
        return false
      } else {
        return this.lastResponse.isNewer
      }
    },
    isDownloading: function () {
      return this.downloadProgress.isCurrentlyDownloading
    },
    isFinished: function () {
      return this.downloadProgress.finished
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
    getETA: function () {
      let seconds = this.downloadProgress.eta_seconds
      if (seconds > 60) {
        return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's'
      } else {
        return seconds + 's'
      }
    }
  },
  created: function () {
    // Immediately retrieve the two status
    ipcRenderer.invoke('update-provider', { command: 'update-status' })
      .then(lastResponse => { this.lastResponse = lastResponse })
      .catch(e => console.error(e))

    ipcRenderer.invoke('update-provider', { command: 'download-progress' })
      .then(downloadProgress => { this.downloadProgress = downloadProgress })
      .catch(e => console.error(e))

    setInterval(() => {
      ipcRenderer.invoke('update-provider', { command: 'download-progress' })
        .then(downloadProgress => { this.downloadProgress = downloadProgress })
        .catch(e => console.error(e))
    }, 1000) // Check every second if there's an update
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
      this.startButtonLabel = 'Starting update …' // TODO: Translate
      ipcRenderer.invoke('update-provider', { command: 'begin-update' })
        .catch(e => {
          this.disableStartButton = false
          console.error(e)
        })
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
