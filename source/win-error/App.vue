<template>
  <WindowChrome
    v-bind:title="title"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="true"
    v-bind:statusbar-controls="statusbarControls"
    v-bind:disable-vibrancy="true"
    v-on:statusbar-click="handleClick($event)"
  >
    <div id="error">
      <p>{{ message }}</p>
      <p v-if="additionalInfo" id="additional-info">
        {{ additionalInfo }}
      </p>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Error
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Entry component for the error modal window.
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/WindowChrome.vue'
import { trans } from '@common/i18n-renderer'
import { type StatusbarControl } from '@common/vue/window/WindowStatusbar.vue'

const ipcRenderer = window.ipc

// Retrieve the error information from the URL search params
const searchParams = new URLSearchParams(window.location.search)
const titleParam = searchParams.get('title')
const message = searchParams.get('message')
const contents = searchParams.get('contents')

// Because they HAVE to provide both title AND message, those two
// variables might be the same for a few error messages. In this
// case, fall back to "error".
const title = (titleParam === message || titleParam === null) ? 'Error' : titleParam
const additionalInfo = (contents === '<no-contents>') ? '' : contents

function handleClick (controlID: string): void {
  if (controlID === 'ok') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
}

const statusbarControls: StatusbarControl[] = [
  {
    type: 'button',
    label: trans('Ok'),
    id: 'ok',
    buttonClass: 'primary' // It's a primary button
  }
]
</script>

<style lang="less">
div#error {
  padding: 10px;
  user-select: text;
  text-align: center;

  p#additional-info {
    text-align: left;
    white-space: pre-line;
    font-family: monospace;
    margin: 10px 0px;
  }
}
</style>
