<template>
  <div ref="log-viewer" id="log-viewer">
    <Message
      v-for="(entry, idx) in filteredMessages"
      v-bind:key="idx"
      v-bind:message="entry"
    />
  </div>
</template>

<script>
import { ipcRenderer } from 'electron'
import Message from './message.vue'

export default {
  components: {
    Message
  },
  data: function () {
    return {
      lastIndex: 0, // Last log message array index; updated from the main process
      messages: [], // Holds all the log files
      // Filters TODO: Actually enable setting and getting these
      includeVerbose: true,
      includeInfo: true,
      includeWarning: true,
      includeError: true
    }
  },
  computed: {
    filteredMessages: function () {
      return this.messages.filter(message => {
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
    }
  },
  mounted: function () {
    const self = this
    setInterval(function () {
      self.fetchData()
    }, 1000)
  },
  methods: {
    fetchData: async function () {
      const newLogs = await ipcRenderer.invoke('log-provider', {
        command: 'retrieve-log-chunk',
        lastIndex: this.lastIndex
      })

      const shouldScroll = this.containerScrolledToBottom()

      this.lastIndex += newLogs.length
      this.messages = this.messages.concat(newLogs)
      // Vue will update itself only on the next tick, so let's await that
      if (shouldScroll) {
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    containerScrolledToBottom: function () {
      const elem = this.$refs['log-viewer']
      const lastVisiblePixel = elem.getBoundingClientRect().height + elem.scrollTop
      const leftToShow = elem.scrollHeight - lastVisiblePixel

      return leftToShow === 0
    },
    scrollToBottom: function () {
      const elem = this.$refs['log-viewer']
      elem.scrollTop = elem.scrollHeight - elem.getBoundingClientRect().height
    }
  }
}
</script>

<style lang="less">
#log-viewer {
  user-select: text;
  position: absolute;
  top: 39px;
  bottom: 0px;
  width: 100%;
  height: calc(100vh - 39px);
  overflow-y: auto;
  overflow-x: hidden;
  background-color: rgb(131, 137, 151);
  color: white;
}

.hidden {
  display: none;
}
</style>
