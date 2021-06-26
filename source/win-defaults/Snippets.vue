<template>
  <SplitView
    v-bind:initial-size-percent="[ 20, 80 ]"
    v-bind:minimum-size-percent="[ 20, 20 ]"
    v-bind:split="'horizontal'"
    v-bind:initial-total-width="100"
  >
    <template #view1>
      <SelectableList
        v-bind:items="availableSnippets"
        v-bind:selected-item="currentItem"
        v-bind:editable="true"
        v-on:select="currentItem = $event"
        v-on:add="addSnippet()"
        v-on:remove="removeSnippet()"
      ></SelectableList>
    </template>
    <template #view2>
      <div style="padding: 10px;">
        <p>Edit your snippets here.</p>

        <p>
          <TextControl
            v-model="currentSnippetText"
            v-bind:inline="true"
          ></TextControl>
          <ButtonControl
            v-bind:label="'Rename snippet'"
            v-bind:inline="true"
            v-bind:disabled="availableSnippets.length === 0 || currentSnippetText === availableSnippets[currentItem]"
            v-on:click="renameSnippet()"
          ></ButtonControl>
        </p>

        <CodeEditor
          ref="code-editor"
          v-model="editorContents"
          v-bind:mode="'markdown-snippets'"
        ></CodeEditor>

        <!-- TODO: This list belongs in the docs, but during the test phase, this is okay. -->
        <p>
          <small>
            Supported variables:
            CURRENT_YEAR (4 digits),
            CURRENT_YEAR_SHORT (2 digits),
            CURRENT_MONTH (2 digits),
            CURRENT_MONTH_NAME (localised),
            CURRENT_MONTH_NAME_SHORT (localised),
            CURRENT_DATE (2 digits),
            CURRENT_HOUR (2 digits),
            CURRENT_MINUTE (2 digits),
            CURRENT_SECOND (2 digits),
            CURRENT_SECONDS_UNIX (timestamp),
            UUID,
            CLIPBOARD (text clipboard only),
            ZKN_ID (according to your pattern)
          </small>
        </p>
        <p>
          <small><strong>Note: The variables list will move to the docs before release.</strong></small>
        </p>

        <ButtonControl
          v-bind:primary="true"
          v-bind:label="'Save'"
          v-bind:inline="true"
          v-on:click="saveSnippet()"
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
import TextControl from '../common/vue/form/elements/Text.vue'
import CodeEditor from '../common/vue/CodeEditor'
import { trans } from '../common/i18n-renderer'

const ipcRenderer = window.ipc

export default {
  name: 'Snippets',
  components: {
    SplitView,
    SelectableList,
    CodeEditor,
    ButtonControl,
    TextControl
  },
  data: function () {
    return {
      currentItem: 0,
      currentSnippetText: '',
      editorContents: '',
      savingStatus: '',
      availableSnippets: []
    }
  },
  watch: {
    currentItem: function (newValue, oldValue) {
      this.loadState()
    },
    editorContents: function () {
      if (this.$refs['code-editor'].isClean() === true) {
        this.savingStatus = ''
      } else {
        this.savingStatus = trans('gui.assets_man.status.unsaved_changes')
      }
    }
  },
  created: function () {
    this.updateAvailableSnippets()
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'save-file') {
        this.saveSnippet()
      }
    })
  },
  methods: {
    updateAvailableSnippets: function () {
      ipcRenderer.invoke('assets-provider', { command: 'list-snippets' })
        .then(data => {
          this.availableSnippets = data
          if (this.currentItem >= this.availableSnippets.length) {
            this.currentItem = this.availableSnippets.length - 1
          }
          this.loadState()
        })
        .catch(err => console.error(err))
    },
    loadState: function () {
      if (this.availableSnippets.length === 0) {
        this.editorContents = ''
        this.$refs['code-editor'].markClean()
        this.savingStatus = ''
        this.currentSnippetText = ''
        return // No state to load, only an error to avoid
      }

      ipcRenderer.invoke('assets-provider', {
        command: 'get-snippet',
        payload: {
          name: this.availableSnippets[this.currentItem]
        }
      })
        .then(data => {
          this.editorContents = data
          this.$refs['code-editor'].markClean()
          this.savingStatus = ''
          this.currentSnippetText = this.availableSnippets[this.currentItem]
        })
        .catch(err => console.error(err))
    },
    saveSnippet: function () {
      this.savingStatus = trans('gui.assets_man.status.saving')

      ipcRenderer.invoke('assets-provider', {
        command: 'set-snippet',
        payload: {
          name: this.availableSnippets[this.currentItem],
          contents: this.editorContents
        }
      })
        .then(() => {
          this.savingStatus = trans('gui.assets_man.status.saved')
          setTimeout(() => {
            this.savingStatus = ''
          }, 1000)
        })
        .catch(err => console.error(err))
    },
    addSnippet: function () {
      // Adds a snippet with empty contents and a generic default name
      let newName = 1

      while (this.availableSnippets.includes('snippet-' + newName) === true) {
        newName++
      }

      ipcRenderer.invoke('assets-provider', {
        command: 'set-snippet',
        payload: {
          name: 'snippet-' + newName,
          contents: ''
        }
      })
        .then(() => {
          this.updateAvailableSnippets()
        })
        .catch(err => console.error(err))
    },
    removeSnippet: function () {
      // Remove the current snippet.
      ipcRenderer.invoke('assets-provider', {
        command: 'remove-snippet',
        payload: { name: this.availableSnippets[this.currentItem] }
      })
        .then(() => { this.updateAvailableSnippets() })
        .catch(err => console.error(err))
    },
    renameSnippet: function () {
      let newVal = this.currentSnippetText

      // Sanitise the name
      newVal = newVal.replace(/[^a-zA-Z0-9_-]/g, '-')

      ipcRenderer.invoke('assets-provider', {
        command: 'rename-snippet',
        payload: {
          name: this.availableSnippets[this.currentItem],
          newName: newVal
        }
      })
        .then(() => {
          this.updateAvailableSnippets()
        })
        .catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
//
</style>
