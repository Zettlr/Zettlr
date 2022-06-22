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
        v-bind:editable="true"
        v-bind:selected-item="currentItem"
        v-on:select="currentItem = $event"
        v-on:add="newDefaultsFile()"
        v-on:remove="removeFile($event)"
      ></SelectableList>
    </template>
    <template #view2>
      <div id="defaults-container">
        <p>{{ defaultsExplanation }}</p>

        <TextControl
          v-model="currentFilename"
          v-bind:inline="false"
          v-bind:disabled="currentItem < 0"
          v-on:confirm="renameFile()"
        ></TextControl>
        <ButtonControl
          v-bind:label="renameFileLabel"
          v-bind:inline="true"
          v-bind:disabled="visibleItems.length === 0 || currentFilename === visibleItems[currentItem].name"
          v-on:click="renameFile()"
        ></ButtonControl>

        <span v-if="visibleItems.length > 0 && visibleItems[currentItem].isProtected === true" class="protected-info">
          <!-- TODO: Translate -->
          &#128274; {{ protectedProfileWarning }}
        </span>

        <p v-if="visibleItems[currentItem]?.isInvalid" class="warning">
          <clr-icon shape="warning"></clr-icon>
          <!-- TODO: Translate! -->
          <span> <!-- NOTE: Wrapping in a span due to the flex -->
            {{ invalidProfileWarning }}
          </span>
        </p>

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
import TextControl from '@common/vue/form/elements/Text.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import CodeEditor from '@common/vue/CodeEditor.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'
import { PandocProfileMetadata } from '@dts/common/assets'
import { PANDOC_READERS, PANDOC_WRITERS, SUPPORTED_READERS } from '@common/util/pandoc-maps'
import sanitizeFilename from 'sanitize-filename'
import getPlainPandocReaderWriter from '@common/util/plain-pandoc-reader-writer'

const ipcRenderer = window.ipc

const NEW_DEFAULTS_FILE_CONTENTS = `# This is a new defaults file that you can use to define rules for exporting or
# importing files to and from Zettlr. The only two required properties are the
# writer and reader ones. Without them, Zettlr will not be able to export or
# import your files. You can choose any reader or writer that is supported by
# Pandoc. Zettlr will automatically show the profile at appropriate locations
# based on the values of the writer and reader properties.
# More info: https://pandoc.org/MANUAL.html.
reader: markdown
writer: markdown
`

export default defineComponent({
  name: 'DefaultsApp',
  components: {
    SplitView,
    SelectableList,
    CodeEditor,
    ButtonControl,
    TextControl
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
      currentFilename: '',
      editorContents: '',
      savingStatus: '',
      availableDefaultsFiles: [] as PandocProfileMetadata[]
    }
  },
  computed: {
    protectedProfileWarning: function (): string {
      return trans('dialog.defaults.protected_warning')
    },
    invalidProfileWarning: function (): string {
      return trans('dialog.defaults.invalid_warning')
    },
    renameFileLabel: function (): string {
      return 'Rename file'
    },
    codeEditor: function (): typeof CodeEditor {
      return this.$refs['code-editor'] as typeof CodeEditor
    },
    visibleItems: function (): PandocProfileMetadata[] {
      // Display either the exporting or importing formats depending on the tab
      return this.availableDefaultsFiles
        .filter((e) => {
          // Retrieve which one we need to check
          const readerWriter = (this.which === 'import') ? e.writer : e.reader
          return SUPPORTED_READERS.includes(getPlainPandocReaderWriter(readerWriter))
        })
    },
    listItems: function (): any[] {
      return this.visibleItems
        .map(file => {
          // Try to resolve known and fully supported extensions
          const reader = file.reader in PANDOC_READERS ? PANDOC_READERS[file.reader] : file.reader
          const writer = file.writer in PANDOC_WRITERS ? PANDOC_WRITERS[file.writer] : file.writer
          const infoString = (file.isInvalid) ? 'Invalid' : [ reader, writer ].join(' → ')

          return {
            displayText: this.getDisplayText(file),
            infoString: infoString,
            infoStringClass: file.isInvalid ? 'error' : undefined
          }
        })
    },
    defaultsExplanation: function (): string {
      return trans('dialog.defaults.explanation') // Edit the corresponding defaults file here.
    },
    saveButtonLabel: function (): string {
      return trans('dialog.button.save')
    }
  },
  watch: {
    which: function (newValue, oldValue) {
      // Reset to the beginning of the list. The watcher right below will pick
      // that change up and re-load the defaults.
      this.currentItem = -1
      this.loadDefaultsForState().catch(e => console.error(e))
    },
    currentItem: function (newValue, oldValue) {
      this.loadDefaultsForState().catch(e => console.error(e))
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
    this.retrieveDefaultsFiles()
      .then(() => this.loadDefaultsForState().catch(e => console.error(e)))
      .catch(e => console.error(e))

    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'save-file') {
        this.saveDefaultsFile()
      }
    })
  },
  methods: {
    loadDefaultsForState: async function () {
      // Loads a defaults file from main for the given state (tab + list item)
      if (this.availableDefaultsFiles.length === 0) {
        this.currentFilename = ''
        return
      }

      if (this.currentItem < 0) {
        this.currentItem = 0
      }

      if (this.currentItem >= this.visibleItems.length) {
        this.currentItem = this.visibleItems.length - 1
      }

      const name = this.visibleItems[this.currentItem].name

      ipcRenderer.invoke('assets-provider', {
        command: 'get-defaults-file',
        payload: { filename: name }
      })
        .then(data => {
          this.editorContents = data
          this.codeEditor.markClean()
          this.currentFilename = this.visibleItems[this.currentItem].name
          this.savingStatus = ''
        })
        .catch(err => console.error(err))
    },
    retrieveDefaultsFiles: async function () {
      // NOTE: Here we are explicitly requesting only the defaults files, not
      // all export profiles, because here it's only about modifying them (which
      // does not work with the custom profiles the exporter provides).
      ipcRenderer.invoke('assets-provider', {
        command: 'list-defaults'
      })
        .then((files: PandocProfileMetadata[]) => {
          this.availableDefaultsFiles = files
          if (this.currentItem < 0) {
            this.currentItem = 0
          }
          this.loadDefaultsForState().catch(e => console.error(e))
        })
        .catch(err => console.error(err))
    },
    saveDefaultsFile: function () {
      this.savingStatus = trans('gui.assets_man.status.saving')

      const name = this.visibleItems[this.currentItem].name

      ipcRenderer.invoke('assets-provider', {
        command: 'set-defaults-file',
        payload: { filename: name, contents: this.editorContents }
      })
        .then(async () => {
          this.savingStatus = trans('gui.assets_man.status.saved')
          await this.retrieveDefaultsFiles() // Always make sure to pull in any changes
          setTimeout(() => { this.savingStatus = '' }, 1000)
        })
        .catch(err => console.error(err))
    },
    newDefaultsFile: function () {
      // Create a new defaults file
      const d = new Date()
      const yyyy = d.getFullYear()
      const mm = d.getMonth() + 1
      const dd = d.getDate()
      const h = d.getHours()
      const m = d.getMinutes()
      const s = d.getSeconds()

      const newName = `New Profile ${yyyy}-${mm}-${dd} ${h}-${m}-${s}.yaml`
      ipcRenderer.invoke('assets-provider', {
        command: 'set-defaults-file',
        payload: { filename: newName, contents: NEW_DEFAULTS_FILE_CONTENTS }
      })
        .then(async () => {
          await this.retrieveDefaultsFiles() // Always make sure to pull in any changes
        })
        .catch(err => console.error(err))
    },
    renameFile: function () {
      let newName = this.currentFilename
      if (!newName.endsWith('.yaml') && !newName.endsWith('.yml')) {
        newName += '.yaml'
      }

      newName = sanitizeFilename(newName, { replacement: '-' })

      const oldName = this.visibleItems[this.currentItem].name

      ipcRenderer.invoke('assets-provider', {
        command: 'rename-defaults-file',
        payload: { oldName, newName }
      })
        .then(async () => {
          await this.retrieveDefaultsFiles() // Always make sure to pull in any changes
        })
        .catch(err => console.error(err))
    },
    removeFile: function (idx: number) {
      if (idx > this.visibleItems.length - 1 || idx < 0) {
        return
      }

      const filename = this.visibleItems[idx].name

      ipcRenderer.invoke('assets-provider', {
        command: 'remove-defaults-file',
        payload: { filename }
      })
        .then(async () => {
          await this.retrieveDefaultsFiles() // Always make sure to pull in any changes
        })
        .catch(err => console.error(err))
    },
    getDisplayText: function (profile: PandocProfileMetadata): string {
      let name = profile.name
      // First, strip off the extension
      name = name.substring(0, name.lastIndexOf('.'))
      // If the file is protected, indicate this in the list, using a lock emoji
      // To get the lock symbol's JS representation you have to do weird tricks:
      // Get the char code (! not codePoint) at the first (0) and second (1)
      // position and prepend that with \u
      if (profile.isProtected === true) {
        name = '\ud83d\udd12 ' + name
      }
      return name
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

  p.warning {
    display: flex;
    color: rgb(97, 97, 0);
    background-color: rgb(209, 209, 23);
    border: 1px solid rgb(170, 170, 0);
    border-radius: 5px;
    padding: 5px;
    margin: 5px;

    // More spacing between the icon and the text
    span { padding-left: 5px; }
  }

  span.protected-info {
    color: gray;
  }
}
</style>
