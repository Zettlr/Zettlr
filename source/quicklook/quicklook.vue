<template>
  <div
    id="ql-container"
    v-on:keyup.stop="onKeyup"
  >
    <Editor
      v-bind:id="id"
      v-bind:fontSize="fontSize"
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
  </div>
</template>

<script>
const { ipcRenderer } = require('electron')
const Editor = require('./editor.vue').default

export default {
  components: {
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
  mounted: function () {
    ipcRenderer.on('config-update', (evt, config) => {
      this.$emit('config-update')
    })
  },
  methods: {
    onKeyup: function (event) {
      if (!event.metaKey && process.platform === 'darwin') return
      if (!event.ctrlKey && process.platform !== 'darwin') return

      if ([ 'f', 'F' ].includes(event.key)) {
        event.stopPropagation()
        document.getElementById('toolbar').querySelector('input').focus()
      }
    }
  }
}
</script>
