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

<script lang="ts">
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
import WindowChrome from '@common/vue/window/Chrome.vue'
import { trans } from '@common/i18n-renderer'
import { IpcRenderer } from 'electron'
import { defineComponent } from 'vue'

const ipcRenderer: IpcRenderer = (window as any).ipc

export default defineComponent({
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
    shouldShowTitlebar: function (): boolean {
      return process.platform !== 'darwin'
    },
    windowTitle: function (): string {
      let title = this.name
      const firstHeadings = Boolean((global as any).config.get('display.useFirstHeadings'))
      if (this.type === 'file') {
        if (this.firstHeading !== null && firstHeadings) {
          title = this.firstHeading
        }
        if (this.frontmatter != null && 'title' in this.frontmatter) {
          title = (this.frontmatter as any).title
        }
      }
      return title
    },
    toolbarControls: function (): any[] {
      const ctrl: any[] = [
        {
          type: 'spacer', // Make sure the content is flushed to the left
          size: 'size-5x'
        },
        {
          type: 'search',
          placeholder: trans('dialog.find.find_placeholder'),
          onInputHandler: (value: string) => {
            this.query = value
          },
          onSubmitHandler: (value: string) => {
            (this.$refs.editor as typeof QuicklookEditor).searchNext()
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
        ;(this.$refs.editor as typeof QuicklookEditor).updateConfig(payload)
      }
    })
  },
  methods: {
    searchNext: function (query: string) {
      this.query = query
      ;(this.$refs.editor as typeof QuicklookEditor).searchNext()
    }
  }
})
</script>

<style lang="less">
.CodeMirror .CodeMirror-gutters {
  border-right: none;
  background-color: transparent;
}
</style>
