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

<script>
import WindowChrome from '../common/vue/window/Chrome.vue'
import { ipcRenderer } from 'electron'

export default {
  name: 'PasteImage',
  components: {
    WindowChrome
  },
  data: function () {
    // Get the hash from the window arguments
    let title
    let message
    let contents
    [ title, message, contents ] = window.process.argv.slice(-3)
    // Finally set the data object
    if (title === message) {
      // Because they HAVE to provide both title AND message, those two
      // variables might be the same for a few error messages. In this
      // case, fall back to "error".
      title = 'Error'
    }
    return {
      title: title,
      message: message,
      additionalInfo: (contents === '<no-contents>') ? '' : contents
    }
  },
  computed: {
    statusbarControls: function () {
      return [
        {
          type: 'button',
          label: 'Ok', // TODO
          id: 'ok',
          icon: '',
          buttonClass: 'primary' // It's a primary button
        }
      ]
    }
  },
  methods: {
    handleClick: function (controlID) {
      if (controlID === 'ok') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
    }
  }
}
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
