<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="false"
    v-bind:menubar="false"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-bind:disable-vibrancy="true"
    v-on:toolbar-search="query = $event"
  >
    <Editor
      v-bind:id="id"
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
    ></Editor>
  </WindowChrome>
</template>

<script>
import { ipcRenderer } from 'electron'
import Editor from './editor.vue'
import WindowChrome from '../common/vue/window/Chrome.vue'
import { trans } from '../common/i18n'

export default {
  components: {
    WindowChrome,
    Editor
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
      return [
        {
          type: 'text',
          content: (this.windowTitle === undefined) ? 'QuickLook' : this.windowTitle,
          style: 'strong'
        },
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
            this.$emit('search-next')
          }
        }
      ]
    }
  },
  mounted: function () {
    ipcRenderer.on('config-provider', (event, message) => {
      const { command } = message

      if (command === 'update') {
        const { payload } = message
        this.$emit('config-update', payload)
      }
    })
  },
  methods: {
  }
}
</script>
