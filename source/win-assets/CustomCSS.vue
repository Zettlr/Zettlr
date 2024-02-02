<template>
  <div id="custom-css">
    <p id="custom-css-info" v-html="customCSSInfo"></p>
    <CodeEditor
      ref="code-editor"
      v-model="css"
      v-bind:mode="'css'"
    ></CodeEditor>
    <ButtonControl
      v-bind:primary="true"
      v-bind:label="saveButtonLabel"
      v-bind:inline="true"
      v-on:click="handleClick('save')"
    ></ButtonControl>
    <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CustomCSS
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Entry point app component for the Custom CSS editor.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import CodeEditor from '@common/vue/CodeEditor.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import { defineComponent } from 'vue'

const ipcRenderer = window.ipc

export default defineComponent({
  name: 'CustomCSS',
  components: {
    CodeEditor,
    ButtonControl
  },
  data: function () {
    return {
      customCSSTitle: trans('Custom CSS'),
      customCSSInfo: trans('Here you can override the styles of Zettlr to customise it even further. <strong>Attention: This file overrides all CSS directives! Never alter the geometry of elements, otherwise the app may expose unwanted behaviour!</strong>'),
      css: '',
      savingStatus: ''
    }
  },
  computed: {
    statusbarControls: function (): any[] {
      return [
        {
          type: 'button',
          label: trans('Save'),
          id: 'save',
          icon: '',
          buttonClass: 'primary' // It's a primary button
        },
        {
          type: 'button',
          label: trans('Cancel'),
          id: 'cancel',
          icon: ''
        }
      ]
    },
    saveButtonLabel: function (): string {
      return trans('Save')
    }
  },
  watch: {
    css: function () {
      const editor = this.$refs['code-editor'] as typeof CodeEditor
      if (editor.isClean() === true) {
        this.savingStatus = ''
      } else {
        this.savingStatus = trans('Unsaved changes')
      }
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
  mounted: function () {
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'save-file') {
        this.handleClick('save')
      }
    })
  },
  methods: {
    handleClick: function (controlID: string) {
      if (controlID === 'save') {
        this.savingStatus = trans('Saving …')
        ipcRenderer.invoke('css-provider', {
          command: 'set-custom-css',
          css: this.css
        })
          .then(() => {
            this.savingStatus = ''
          })
          .catch(e => {
            this.savingStatus = trans('Saving failed')
            console.error(e)
          })
      }
    }
  }
})
</script>

<style lang="less">
div#custom-css {
  overflow: auto; // Enable scrolling, if necessary
  padding: 10px;
  width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;

  .CodeMirror {
    flex-grow: 1;
  }
}

p#custom-css-info {
  margin-bottom: 20px;
}
</style>
