<template>
  <SplitView
    v-bind:initial-size-percent="[ 20, 80 ]"
    v-bind:minimum-size-percent="[ 20, 20 ]"
    v-bind:split="'horizontal'"
    v-bind:initial-total-width="100"
  >
    <template #view1>
      <SelectableList
        v-bind:items="listItems"
        v-bind:selected-item="currentItem"
        v-on:select="currentItem = $event"
      ></SelectableList>
    </template>
    <template #view2>
      <div style="padding: 10px;">
        <p>Edit the corresponding defaults file here.</p>

        <CodeEditor
          ref="code-editor"
          v-model="editorContents"
          v-bind:mode="'yaml'"
        ></CodeEditor>
        <ButtonControl
          v-bind:primary="true"
          v-bind:label="'Save'"
          v-bind:inline="true"
          v-on:click="saveDefaultsFile()"
        ></ButtonControl>
        <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
      </div>
    </template>
  </SplitView>
</template>

<script>
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Defaults
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the defaults file editor view. It allows users to
 *                  modify the provided defaults files.
 *
 * END HEADER
 */

import SplitView from '../common/vue/window/SplitView'
import SelectableList from './SelectableList'
import ButtonControl from '../common/vue/form/elements/Button'
import CodeEditor from '../common/vue/CodeEditor'

const ipcRenderer = window.ipc

const WRITERS = {
  'html': 'HTML',
  'pdf': 'PDF',
  'docx': 'Word',
  'odt': 'OpenDocument Text',
  'rtf': 'RTF',
  'latex': 'LaTeX',
  'org': 'Orgmode',
  'revealjs': 'Reveal.js',
  'plain': 'Plain Text',
  'rst': 'reStructured Text'
}

const READERS = {
  'docbook': 'DocBook',
  'docx': 'Word',
  'epub': 'ePub',
  'haddock': 'Haddock',
  'html': 'HTML',
  'latex': 'LaTeX',
  'muse': 'Muse',
  'odt': 'OpenDocument Text',
  'opml': 'OPML',
  'org': 'Orgmode',
  'rst': 'reStructured Text',
  't2t': 'text2tags',
  'textile': 'Textile',
  'vimwiki': 'VimWiki'
}

export default {
  name: 'DefaultsApp',
  components: {
    SplitView,
    SelectableList,
    CodeEditor,
    ButtonControl
  },
  props: {
    // "which" contains the tab ID from the app. Beware before breaking.
    which: {
      type: String,
      required: true
    }
  },
  data: function () {
    return {
      currentItem: 0,
      editorContents: '',
      savingStatus: ''
    }
  },
  computed: {
    listItems: function () {
      if (this.which === 'tab-export-control') {
        return Object.values(WRITERS)
      } else if (this.which === 'tab-import-control') {
        return Object.values(READERS)
      } else {
        return [] // TODO: We need list items for every tab!
      }
    }
  },
  watch: {
    which: function (newValue, oldValue) {
      this.loadDefaultsForState()
    },
    currentItem: function (newValue, oldValue) {
      this.loadDefaultsForState()
    },
    editorContents: function () {
      if (this.$refs['code-editor'].isClean() === true) {
        this.savingStatus = ''
      } else {
        this.savingStatus = 'Unsaved changes' // TODO translate
      }
    }
  },
  mounted: function () {
    this.loadDefaultsForState()

    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'save-file') {
        this.saveDefaultsFile()
      }
    })
  },
  methods: {
    loadDefaultsForState: function () {
      const isWriter = this.which === 'tab-export-control'
      const isReader = this.which === 'tab-import-control'

      if (!isWriter && !isReader) {
        return // Potentially different tab selected
      }

      let format
      // Loads a defaults file from main for the given state (tab + list item)
      if (isWriter) {
        format = Object.keys(WRITERS)[this.currentItem]
      } else if (isReader) {
        format = Object.keys(READERS)[this.currentItem]
      }

      ipcRenderer.invoke('assets-provider', {
        command: 'get-defaults-file',
        payload: {
          format: format,
          type: (isWriter) ? 'export' : 'import'
        }
      })
        .then(data => {
          this.editorContents = data
          this.$refs['code-editor'].markClean()
          this.savingStatus = ''
        })
        .catch(err => console.error(err))
    },
    saveDefaultsFile: function () {
      const isWriter = this.which === 'tab-export-control'
      const isReader = this.which === 'tab-import-control'

      if (!isWriter && !isReader) {
        // Nothing to do
        return
      }

      this.savingStatus = 'Saving ...' // TODO translate

      let format
      if (isWriter) {
        format = Object.keys(WRITERS)[this.currentItem]
      } else if (isReader) {
        format = Object.keys(READERS)[this.currentItem]
      }

      ipcRenderer.invoke('assets-provider', {
        command: 'set-defaults-file',
        payload: {
          format: format,
          type: (isWriter) ? 'export' : 'import',
          contents: this.editorContents
        }
      })
        .then(() => {
          this.savingStatus = 'Saved!' // TODO: Translate
          setTimeout(() => {
            this.savingStatus = ''
          }, 1000)
        })
        .catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
//
</style>
