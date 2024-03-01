<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-bind:disable-vibrancy="true"
    v-on:toolbar-click="handleClick($event)"
  >
    <iframe
      v-bind:src="fileUrl"
      style="position: relative; width: 0; height: 0; width: 100%; height: 100%; border: none"
      sandbox="allow-same-origin allow-modals"
    >
    </iframe>
  </WindowChrome>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Print
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component displays the print window.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import WindowChrome from '@common/vue/window/WindowChrome.vue'
import { computed } from 'vue'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import { type ToolbarControl } from '@common/vue/window/WindowToolbar.vue'

const toolbarControls: ToolbarControl[] = [
  {
    type: 'spacer',
    id: 'spacer-one',
    size: '5x'
  },
  {
    type: 'button',
    label: '',
    id: 'print',
    icon: 'printer'
  }
]

const searchParams = new URLSearchParams(window.location.search)
const filePath = searchParams.get('file') ?? ''

const windowTitle = computed(() => {
  if (filePath !== '') {
    document.title = pathBasename(filePath)
    return pathBasename(filePath)
  } else {
    document.title = trans('Print…')
    return trans('Print…')
  }
})

// TODO: We do need to retrieve the file from main so that it's served in the
// same "origin" 🫠
const fileUrl = computed(() => `safe-file://${filePath}`)

function handleClick (buttonID?: string): void {
  if (buttonID === 'print') {
    // NOTE: Printing only works in production, as during development
    // contents are served from localhost:3000 (which gives a CORS error)
    window.frames[0].print()
  }
}
</script>

<style lang="less">
//
</style>
@common/util/renderer-path-polyfill
