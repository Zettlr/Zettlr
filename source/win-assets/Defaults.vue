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
      <div id="defaults-container">
        <p>{{ defaultsExplanation }}</p>

        <CodeEditor
          ref="code-editor"
          v-model="editorContents"
          v-bind:mode="'yaml'"
        ></CodeEditor>

        <!-- This div is used to keep the buttons in a line despite the flex -->
        <div>
          <ButtonControl
            v-bind:primary="true"
            v-bind:label="saveButtonLabel"
            v-bind:inline="true"
            v-on:click="saveDefaultsFile()"
          ></ButtonControl>
          <ButtonControl
            v-bind:primary="false"
            v-bind:label="restoreButtonLabel"
            v-bind:inline="true"
            v-on:click="restoreDefaultsFile()"
          ></ButtonControl>
          <span v-if="savingStatus !== ''" class="saving-status">{{ savingStatus }}</span>
        </div>
      </div>
    </template>
  </SplitView>
</template>

<script lang="ts">
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

import SplitView from '@common/vue/window/SplitView.vue'
import SelectableList from '@common/vue/form/elements/SelectableList.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import CodeEditor from '@common/vue/CodeEditor.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'

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
  'rst': 'reStructured Text',
  'markdown': 'Markdown'
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

export default defineComponent({
  name: 'DefaultsApp',
  components: {
    SplitView,
    SelectableList,
    CodeEditor,
    ButtonControl
  },
  props: {
    // "which" describes which kind of defaults files this instance controls
    // can be "import" (for any --> Markdown) or "export" (for Markdown --> any)
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
    listItems: function (): string[] {
      const formatList = (this.which === 'export') ? WRITERS : READERS
      return Object.values(formatList)
    },
    defaultsExplanation: function (): string {
      return trans('dialog.defaults.explanation') // Edit the corresponding defaults file here.
    },
    saveButtonLabel: function (): string {
      return trans('dialog.button.save')
    },
    restoreButtonLabel: function (): string {
      return trans('dialog.defaults.restore')
    }
  },
  watch: {
    which: function (newValue, oldValue) {
      // Reset to the beginning of the list. The watcher right below will pick
      // that change up and re-load the defaults.
      this.currentItem = 0
    },
    currentItem: function (newValue, oldValue) {
      this.loadDefaultsForState()
    },
    editorContents: function () {
      const editor = this.$refs['code-editor'] as typeof CodeEditor
      if (editor.isClean() === true) {
        this.savingStatus = ''
      } else {
        this.savingStatus = trans('gui.assets_man.status.unsaved_changes')
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
      const formatList = (this.which === 'export') ? WRITERS : READERS

      // Loads a defaults file from main for the given state (tab + list item)
      const format = Object.keys(formatList)[this.currentItem]

      ipcRenderer.invoke('assets-provider', {
        command: 'get-defaults-file',
        payload: {
          format: format,
          type: this.which
        }
      })
        .then(data => {
          this.editorContents = data
          ;(this.$refs['code-editor'] as typeof CodeEditor).markClean()
          this.savingStatus = ''
        })
        .catch(err => console.error(err))
    },
    saveDefaultsFile: function () {
      this.savingStatus = trans('gui.assets_man.status.saving')

      const formatList = (this.which === 'export') ? WRITERS : READERS
      const format = Object.keys(formatList)[this.currentItem]

      ipcRenderer.invoke('assets-provider', {
        command: 'set-defaults-file',
        payload: {
          format: format,
          type: this.which,
          contents: this.editorContents
        }
      })
        .then(() => {
          this.savingStatus = trans('gui.assets_man.status.saved')
          setTimeout(() => { this.savingStatus = '' }, 1000)
        })
        .catch(err => console.error(err))
    },
    restoreDefaultsFile: function () {
      this.savingStatus = trans('gui.assets_man.defaults_restoring')

      const formatList = (this.which === 'export') ? WRITERS : READERS
      const format = Object.keys(formatList)[this.currentItem]

      ipcRenderer.invoke('assets-provider', {
        command: 'restore-defaults-file',
        payload: {
          format: format,
          type: this.which
        }
      })
        .then((result) => {
          if (result === true) {
            this.savingStatus = trans('Defaults file restored.')
            // Immediately re-fetch the now restored defaults file
            this.loadDefaultsForState()
            setTimeout(() => { this.savingStatus = '' }, 1000)
          } else {
            this.savingStatus = trans('gui.assets_man.defaults_restore_error')
          }
        })
        .catch(err => { console.error(err) })
    }
  }
})
</script>

<style lang="less">
#defaults-container {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .CodeMirror {
    flex-grow: 1;
  }
}
</style>
