<template>
  <WindowChrome
    v-bind:title="customCSSTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-statusbar="true"
    v-bind:statusbar-controls="statusbarControls"
    v-bind:disable-vibrancy="true"
    v-on:statusbar-click="handleClick($event)"
  >
    <div id="custom-css">
      <p id="custom-css-info" v-html="customCSSInfo"></p>
      <CodeEditor
        v-model="css"
        v-bind:mode="'css'"
      ></CodeEditor>
    </div>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
import { trans } from '../common/i18n-renderer'
import CodeEditor from '../common/vue/CodeEditor'

const ipcRenderer = window.ipc

export default {
  name: 'CustomCSS',
  components: {
    WindowChrome,
    CodeEditor
  },
  data: function () {
    return {
      customCSSTitle: trans('dialog.custom_css.title'),
      customCSSInfo: trans('dialog.custom_css.info'),
      css: ''
    }
  },
  computed: {
    statusbarControls: function () {
      return [
        {
          type: 'button',
          label: trans('dialog.button.save'),
          id: 'save',
          icon: '',
          buttonClass: 'primary' // It's a primary button
        },
        {
          type: 'button',
          label: trans('dialog.button.cancel'),
          id: 'cancel',
          icon: ''
        }
      ]
    }
  },
  created: function () {
    ipcRenderer.invoke('css-provider', {
      command: 'get-custom-css'
    })
      .then(css => {
        this.css = css
      })
      .catch(e => console.error(e))
  },
  methods: {
    handleClick: function (controlID) {
      if (controlID === 'save') {
        ipcRenderer.invoke('css-provider', {
          command: 'set-custom-css',
          css: this.css
        })
          .then(() => {
            // After we have successfully saved, close the window
            ipcRenderer.send('window-controls', { command: 'win-close' })
          })
          .catch(e => console.error(e))
      } else if (controlID === 'cancel') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
    }
  }
}
</script>

<style lang="less">
div#custom-css {
  overflow: auto; // Enable scrolling, if necessary
  padding: 10px;
  width: 100vw;
}

p#custom-css-info {
  margin-bottom: 20px;
}
</style>
