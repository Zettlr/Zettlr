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
      sandbox=""
    >
    </iframe>
  </WindowChrome>
</template>

<script lang="ts">
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
import { defineComponent } from 'vue'
import { pathBasename } from '@common/util/renderer-path-polyfill'
import { type ToolbarControl } from '@common/vue/window/WindowToolbar.vue'

export default defineComponent({
  components: {
    WindowChrome
  },
  data: function () {
    return {
      filePath: ''
    }
  },
  computed: {
    windowTitle: function (): string {
      if (this.filePath !== '') {
        document.title = pathBasename(this.filePath)
        return pathBasename(this.filePath)
      } else {
        document.title = trans('Print…')
        return trans('Print…')
      }
    },
    fileUrl: function (): string {
      // TODO: With safe-file:// added electron crashes as soon as the print
      // window is opened.
      return `file://${this.filePath}`
    },
    toolbarControls: function (): ToolbarControl[] {
      return [
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
    }
  },
  methods: {
    handleClick: function (buttonID?: string) {
      if (buttonID === 'print') {
        // NOTE: Printing only works in production, as during development
        // contents are served from localhost:3000 (which gives a CORS error)
        window.frames[0].print()
      }
    }
  }
})
</script>

<style lang="less">
//
</style>
@common/util/renderer-path-polyfill
