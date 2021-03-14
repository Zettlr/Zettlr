<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-on:toolbar-click="handleClick($event)"
  >
    <iframe
      v-bind:src="fileUrl"
      style="width: 100%; height: 100%"
    >
    </iframe>
  </WindowChrome>
</template>

<script>
import { trans } from '../common/i18n'
import path from 'path'
import WindowChrome from '../common/vue/window/Chrome.vue'

export default {
  name: 'Print',
  components: {
    WindowChrome
  },
  data: function () {
    return {
      filePath: ''
    }
  },
  computed: {
    windowTitle: function () {
      if (this.filePath !== '') {
        document.title = path.basename(this.filePath)
        return path.basename(this.filePath)
      } else {
        document.title = trans('menu.print')
        return trans('menu.print')
      }
    },
    fileUrl: function () {
      // TODO: With safe-file:// added electron crashes as soon as the print
      // window is opened.
      return `file://${this.filePath}`
    },
    toolbarControls: function () {
      return [
        {
          type: 'spacer',
          size: 'size-5x'
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
    handleClick: function (buttonID) {
      if (buttonID === 'print') {
        // NOTE: Printing only works in production, as during development
        // contents are served from localhost:3000 (which gives a CORS error)
        window.frames[0].print()
      }
    }
  }
}
</script>

<style lang="less">
//
</style>
