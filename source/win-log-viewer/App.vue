<template>
  <WindowChrome
    v-bind:title="'Log Viewer'"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-toolbar="true"
    v-bind:toolbar-labels="true"
    v-bind:toolbar-controls="toolbarControls"
    v-bind:disable-vibrancy="true"
    v-on:toolbar-search="filter = $event"
    v-on:toolbar-toggle="handleToggle($event)"
  >
    <div id="log-viewer" ref="log-viewer">
      <LogMessage
        v-for="(entry, idx) in filteredMessages"
        v-bind:key="idx"
        v-bind:message="entry"
      />
    </div>
  </WindowChrome>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LogViewer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The main component for the log viewer.
 *
 * END HEADER
 */

import LogMessage from './LogMessage.vue'
import WindowChrome from '@common/vue/window/Chrome.vue'
import { nextTick, defineComponent } from 'vue'
import { ToolbarControl } from '@dts/renderer/window'
import { LogMessage as LM } from '@dts/main/log-provider'

const ipcRenderer = window.ipc

export default defineComponent({
  components: {
    LogMessage,
    WindowChrome
  },
  data: function () {
    return {
      filter: '', // Optionally filter the messages with a string
      nextIndex: 0, // Last log message array index; updated from the main process
      messages: [] as LM[], // Holds all the log files
      includeVerbose: false,
      includeInfo: false,
      includeWarning: true,
      includeError: true
    }
  },
  computed: {
    filteredMessages: function (): LM[] {
      const preFiltered = this.messages.filter(message => {
        if (this.includeVerbose && message.level === 1) {
          return true
        }

        if (this.includeInfo && message.level === 2) {
          return true
        }

        if (this.includeWarning && message.level === 3) {
          return true
        }

        if (this.includeError && message.level === 4) {
          return true
        }

        return false
      })

      const filter = this.filter.trim().toLowerCase()

      if (filter !== '') {
        return preFiltered.filter(message => {
          return message.message.toLowerCase().indexOf(filter) >= 0
        })
      } else {
        return preFiltered
      }
    },
    toolbarControls: function (): ToolbarControl[] {
      return [
        {
          id: 'filter-text',
          type: 'text',
          content: 'Filter messages:'
        },
        {
          type: 'toggle',
          label: 'Verbose',
          id: 'verboseToggle',
          activeClass: 'verbose-control-active',
          initialState: false
        },
        {
          type: 'toggle',
          label: 'Info',
          id: 'infoToggle',
          activeClass: 'info-control-active',
          initialState: false
        },
        {
          type: 'toggle',
          label: 'Warning',
          id: 'warningToggle',
          activeClass: 'warning-control-active',
          initialState: true
        },
        {
          type: 'toggle',
          label: 'Error',
          id: 'errorToggle',
          activeClass: 'error-control-active',
          initialState: true
        },
        {
          type: 'spacer', // Make sure the content is flushed to the left
          id: 'spacer-one',
          size: '3x'
        },
        {
          type: 'search',
          id: 'log-filter',
          placeholder: 'Filter …'
        }
      ] as ToolbarControl[]
    }
  },
  mounted: function () {
    const self = this
    setInterval(function () {
      self.fetchData().catch(e => console.error('Could not fetch new log data', e))
    }, 1000)
  },
  methods: {
    /**
     * Fetches new log data, beginning at nextIndex
     *
     * @return  {void}
     */
    fetchData: async function (): Promise<void> {
      const newLogs = await ipcRenderer.invoke('log-provider', {
        command: 'retrieve-log-chunk',
        nextIndex: this.nextIndex
      })

      const shouldScroll = this.containerScrolledToBottom()

      this.nextIndex += newLogs.length
      this.messages = this.messages.concat(newLogs)
      // Vue will update itself only on the next tick, so let's await that
      if (shouldScroll) {
        await nextTick()
        this.scrollToBottom()
      }
    },
    /**
     * Returns true if the container is currently scrolled to bottom.
     *
     * @return  {boolean}  Whether the container is at the bottom
     */
    containerScrolledToBottom: function () {
      const elem = this.$refs['log-viewer'] as Element
      const lastVisiblePixel = elem.getBoundingClientRect().height + elem.scrollTop
      const leftToShow = elem.scrollHeight - lastVisiblePixel

      return leftToShow === 0
    },
    /**
     * Scrolls the container to the bottom programmatically
     *
     * @return  {void}
     */
    scrollToBottom: function () {
      const elem = this.$refs['log-viewer'] as Element
      elem.scrollTop = elem.scrollHeight - elem.getBoundingClientRect().height
    },
    handleToggle: function (event: { id: string, state: any }) {
      const { id, state } = event
      if (id === 'verboseToggle') {
        this.includeVerbose = state
      } else if (id === 'infoToggle') {
        this.includeInfo = state
      } else if (id === 'warningToggle') {
        this.includeWarning = state
      } else if (id === 'errorToggle') {
        this.includeError = state
      }
    }
  }
})
</script>

<style lang="less">
// This is bad style, but let's add the toolbar button classes here
body div#toolbar button {
  &.verbose-control-active {
    background-color: #d8d8d8;
    color: rgb(131, 131, 131);
  }

  &.warning-control-active {
    background-color: rgb(236, 238, 97);
    color: rgb(139, 139, 24);
  }

  &.info-control-active {
    background-color: rgb(165, 204, 255);
    color: rgb(61, 136, 233);
  }

  &.error-control-active {
    background-color: rgb(255, 130, 130);
    color: rgb(139, 27, 27);
  }
}

#log-viewer {
  user-select: text;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: rgb(131, 137, 151);
  color: white;
}

.hidden {
  display: none;
}
</style>
