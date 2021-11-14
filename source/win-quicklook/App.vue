<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="shouldShowTitlebar"
    v-bind:menubar="false"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-bind:disable-vibrancy="true"
    v-on:toolbar-search="searchNext($event)"
  >
    <QuicklookEditor
      v-bind:id="id"
      ref="editor"
      v-bind:font-size="fontSize"
      v-bind:query="query"
      v-bind:name="name"
      v-bind:dir="dir"
      v-bind:hash="hash"
      v-bind:modtime="modtime"
      v-bind:creationtime="creationtime"
      v-bind:ext="ext"
      v-bind:type="type"
      v-bind:tags="tags"
      v-bind:word-count="wordCount"
      v-bind:char-count="charCount"
      v-bind:target="target"
      v-bind:first-heading="firstHeading"
      v-bind:frontmatter="frontmatter"
      v-bind:linefeed="linefeed"
      v-bind:modified="modified"
      v-bind:content="content"
    ></QuicklookEditor>
  </WindowChrome>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        QuickLook
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a quicklook window
 *
 * END HEADER
 */

import QuicklookEditor from './QuicklookEditor.vue'
import WindowChrome from '../common/vue/window/Chrome.vue'
import { trans } from '../common/i18n-renderer'

const ipcRenderer = window.ipc

export default {
  components: {
    WindowChrome,
    QuicklookEditor
  },
  data: function () {
    return {
      fontSize: 16,
      query: '', // Search
      name: '',
      dir: '',
      hash: 0,
      modtime: 0,
      creationtime: 0,
      ext: '',
      id: '',
      type: 'file',
      tags: [],
      wordCount: 0,
      charCount: 0,
      target: null,
      firstHeading: null,
      frontmatter: null,
      linefeed: '\n',
      modified: false,
      content: ''
    }
  },
  computed: {
    shouldShowTitlebar: function () {
      return process.platform !== 'darwin'
    },
    windowTitle: function () {
      let title = this.name
      const firstHeadings = Boolean(global.config.get('display.useFirstHeadings'))
      if (this.type === 'file') {
        if (this.firstHeading !== null && firstHeadings) {
          title = this.firstHeading
        }
        if (this.frontmatter != null && this.frontmatter.title !== undefined) {
          title = this.frontmatter.title
        }
      }
      return title
    },
    toolbarControls: function () {
      const ctrl = [
        {
          type: 'spacer', // Make sure the content is flushed to the left
          size: 'size-5x'
        },
        {
          type: 'search',
          placeholder: trans('dialog.find.find_placeholder'),
          onInputHandler: (value) => {
            this.query = value
          },
          onSubmitHandler: (value) => {
            this.$refs.editor.searchNext()
          }
        }
      ]

      if (process.platform === 'darwin') {
        // On macOS, we don't have a titlebar. There it is customary to add the window title to the toolbar.
        ctrl.push({
          type: 'text',
          content: (this.windowTitle === undefined) ? 'QuickLook' : this.windowTitle,
          style: 'strong'
        })
      }

      return ctrl
    }
  },
  mounted: function () {
    ipcRenderer.on('config-provider', (event, message) => {
      const { command } = message

      if (command === 'update') {
        const { payload } = message
        this.$refs.editor.updateConfig(payload)
      }
    })
  },
  methods: {
    searchNext: function (query) {
      this.query = query
      this.$refs.editor.searchNext()
    }
  }
}
</script>

<style lang="less">
.CodeMirror .CodeMirror-gutters {
  border-right: none;
  background-color: transparent;
}
</style>
