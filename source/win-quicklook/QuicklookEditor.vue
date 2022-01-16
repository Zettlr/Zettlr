<template>
  <div id="editor" v-bind:style="editorStyles">
    <textarea id="cm-text" ref="editor" style="display:none;"></textarea>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file displays the quicklook editor. Basically the same
 *                  as the main window's Editor component, only with less functions.
 *
 * END HEADER
 */

import MarkdownEditor from '../common/modules/markdown-editor'
import CodeMirror from 'codemirror'
import { IpcRenderer } from 'electron'
import { defineComponent } from 'vue'

const ipcRenderer: IpcRenderer = (window as any).ipc

let mdEditor: MarkdownEditor|null = null
let scrollbarAnnotations = null

export default defineComponent({
  name: 'QuicklookEditor',
  props: {
    fontSize: {
      type: Number,
      default: 16
    },
    query: {
      type: String,
      default: ''
    },
    name: {
      type: String,
      default: ''
    },
    dir: {
      type: String,
      default: ''
    },
    hash: {
      type: Number,
      default: 0
    },
    modtime: {
      type: Number,
      default: 0
    },
    creationtime: {
      type: Number,
      default: 0
    },
    ext: {
      type: String,
      default: ''
    },
    id: {
      type: String,
      default: ''
    },
    type: {
      type: String,
      default: 'file'
    },
    tags: {
      type: Array,
      default: () => { return [] }
    },
    wordCount: {
      type: Number,
      default: 0
    },
    charCount: {
      type: Number,
      default: 0
    },
    frontmatter: {
      type: Object,
      default: null
    },
    linefeed: {
      type: String,
      default: '\n'
    },
    modified: {
      type: Boolean,
      default: false
    },
    content: {
      type: String,
      default: ''
    }
  },
  data: function () {
    return {}
  },
  computed: {
    editorStyles: function () {
      return `font-size: ${this.fontSize}px`
    }
  },
  watch: {
    // We could basically watch any prop, as all are updated simultaneously,
    // but this makes most sense.
    content: function () {
      if (mdEditor === null) {
        console.error('Received a file update but the editor was not yet initiated!')
        return
      }

      mdEditor.setOptions({
        zettlr: {
          markdownImageBasePath: this.dir
        }
      })

      const mode = (this.ext === '.tex') ? 'stex' : 'multiplex'
      mdEditor.swapDoc(CodeMirror.Doc(this.content, mode), mode)
    },
    query: function () {
      // Begin a search
      this.searchNext()
    }
  },
  mounted: function () {
    // As soon as the component is mounted, initiate the editor
    mdEditor = new MarkdownEditor(this.$refs.editor as HTMLTextAreaElement, {
      // If there are images in the Quicklook file, the image renderer needs
      // the directory path of the file to correctly render the images.
      zettlr: {
        markdownImageBasePath: '',
        muteLines: false // We're never muting lines here
      }
    })

    // We're always in fullscreen here
    // this.editor.isFullscreen = true

    // Initiate the scrollbar annotations
    scrollbarAnnotations = mdEditor.codeMirror.annotateScrollbar('sb-annotation')
    scrollbarAnnotations.update([])

    // Listen to shortcuts from the main process
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'copy-as-html' && mdEditor !== null) {
        mdEditor.copyAsHTML()
      }
    })
  },
  methods: {
    updateConfig: function (option: any) {
      if (mdEditor === null) {
        return
      }

      // TODO: Make use of option, too lazy to copy over the boilerplate from
      // the main editor right now. Quicklooks are more static so they shouldn't
      // care too much about these things.
      mdEditor.setOptions({
        zettlr: {
          imagePreviewWidth: (global as any).config.get('display.imageWidth'),
          imagePreviewHeight: (global as any).config.get('display.imageHeight'),
          markdownBoldFormatting: (global as any).config.get('editor.boldFormatting'),
          markdownItalicFormatting: (global as any).config.get('editor.italicFormatting'),
          zettelkasten: (global as any).config.get('zkn'),
          readabilityAlgorithm: (global as any).config.get('editor.readabilityAlgorithm'),
          render: {
            citations: (global as any).config.get('display.renderCitations'),
            iframes: (global as any).config.get('display.renderIframes'),
            images: (global as any).config.get('display.renderImages'),
            links: (global as any).config.get('display.renderLinks'),
            math: (global as any).config.get('display.renderMath'),
            tasks: (global as any).config.get('display.renderTasks'),
            headingTags: (global as any).config.get('display.renderHTags'),
            tables: (global as any).config.get('editor.enableTableHelper')
          }
        }
      })
    },
    searchNext () {
      if (mdEditor === null) {
        return
      }

      mdEditor.searchNext(this.query)
    }
  }
})
</script>

<style lang="less">
body #editor {
  background-color: #ffffff;
  height: 100%;

  .CodeMirror {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    height: 100%;
    background: none;
  }
}

body.dark #editor {
  background-color: rgba(20, 20, 30, 1);
}
</style>
