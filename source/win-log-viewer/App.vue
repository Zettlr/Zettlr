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
    <div id="log-viewer" ref="logViewer">
      <LogMessage
        v-for="(entry, idx) in filteredMessages"
        v-bind:key="idx"
        v-bind:message="entry"
      />
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
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
import WindowChrome from '@common/vue/window/WindowChrome.vue'
import { nextTick, ref, computed } from 'vue'
import { type LogMessage as LM } from '@providers/log'
import { type ToolbarControl } from '@common/vue/window/WindowToolbar.vue'

const ipcRenderer = window.ipc

const toolbarControls: ToolbarControl[] = [
  {
    id: 'filter-text',
    type: 'text',
    align: 'left',
    content: 'Filter messages:'
  },
  {
    type: 'spacer',
    size: '5x'
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
    placeholder: 'Filter…'
  }
]

const filter = ref('') // Optionally filter the messages with a string
const nextIndex = ref(0) // Last log message array index; updated from the main process
const messages = ref<LM[]>([]) // Holds all the log files
const includeVerbose = ref(false)
const includeInfo = ref(false)
const includeWarning = ref(true)
const includeError = ref(true)
const logViewer = ref<null|HTMLDivElement>(null)

const filteredMessages = computed<LM[]>(() => {
  const preFiltered = messages.value.filter(message => {
    if (includeVerbose.value && message.level === 1) {
      return true
    }

    if (includeInfo.value && message.level === 2) {
      return true
    }

    if (includeWarning.value && message.level === 3) {
      return true
    }

    if (includeError.value && message.level === 4) {
      return true
    }

    return false
  })

  const q = filter.value.trim().toLowerCase()

  if (q !== '') {
    return preFiltered.filter(message => {
      return message.message.toLowerCase().includes(q)
    })
  } else {
    return preFiltered
  }
})

// AUTOMATIC REFRESH INTERVAL
setInterval(() => {
  fetchData().catch(e => console.error('Could not fetch new log data', e))
}, 1000)

/**
 * Fetches new log data, beginning at nextIndex
 *
 * @return  {void}
 */
async function fetchData (): Promise<void> {
  const newLogs: LM[] = await ipcRenderer.invoke('log-provider', {
    command: 'retrieve-log-chunk',
    nextIndex: nextIndex.value
  })

  const shouldScroll = containerScrolledToBottom()

  nextIndex.value += newLogs.length
  messages.value = messages.value.concat(newLogs)
  // Vue will update itself only on the next tick, so let's await that
  if (shouldScroll) {
    await nextTick()
    scrollToBottom()
  }
}

/**
 * Returns true if the container is currently scrolled to bottom.
 *
 * @return  {boolean}  Whether the container is at the bottom
 */
function containerScrolledToBottom (): boolean {
  const elem = logViewer.value
  if (elem === null) {
    return true
  }

  const lastVisiblePixel = elem.getBoundingClientRect().height + elem.scrollTop
  const leftToShow = elem.scrollHeight - lastVisiblePixel

  return leftToShow === 0
}

/**
 * Scrolls the container to the bottom programmatically
 *
 * @return  {void}
 */
function scrollToBottom (): void {
  const elem = logViewer.value
  if (elem === null) {
    return
  }

  elem.scrollTop = elem.scrollHeight - elem.getBoundingClientRect().height
}

function handleToggle (event: { id?: string, state?: string|boolean }): void {
  const { id, state } = event
  if (typeof state !== 'boolean') {
    console.warn('Could not toggle log level: State was not a boolean.')
    return
  }
  if (id === 'verboseToggle') {
    includeVerbose.value = state
  } else if (id === 'infoToggle') {
    includeInfo.value = state
  } else if (id === 'warningToggle') {
    includeWarning.value = state
  } else if (id === 'errorToggle') {
    includeError.value = state
  }
}
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
