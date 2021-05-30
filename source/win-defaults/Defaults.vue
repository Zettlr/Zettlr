<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Defaults'"
    v-bind:disable-vibrancy="true"
    v-on:tab="currentTab = $event"
  >
    <!--
      To comply with ARIA, we have to wrap the form in a tab container because
      we make use of the tabbar on the window chrome.
    -->
    <div
      v-bind:id="tabs[currentTab].controls"
      role="tabpanel"
      v-bind:aria-labelledby="tabs[currentTab].id"
      style="height: 100%;"
    >
      <SplitView
        v-bind:initial-size-percent="[ 20, 80 ]"
        v-bind:minimum-size-percent="[ 20, 20 ]"
        v-bind:split="'horizontal'"
        v-bind:initial-total-width="$el.getBoundingClientRect().width"
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
    </div>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
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
    WindowChrome,
    SplitView,
    SelectableList,
    CodeEditor,
    ButtonControl
  },
  data: function () {
    return {
      tabs: [
        {
          label: 'Exporting',
          controls: 'tab-export',
          id: 'tab-export-control',
          icon: 'export'
        },
        {
          label: 'Importing',
          controls: 'tab-import',
          id: 'tab-import-control',
          icon: 'import'
        }
      ],
      currentTab: 0,
      currentItem: 0,
      editorContents: '',
      savingStatus: ''
    }
  },
  computed: {
    windowTitle: function () {
      if (document.body.classList.contains('darwin')) {
        return this.tabs[this.currentTab].label
      } else {
        return 'Defaults Preferences'
      }
    },
    listItems: function () {
      if (this.tabs[this.currentTab].id === 'tab-export-control') {
        return Object.values(WRITERS)
      } else if (this.tabs[this.currentTab].id === 'tab-import-control') {
        return Object.values(READERS)
      } else {
        return [] // TODO: We need list items for every tab!
      }
    }
  },
  watch: {
    currentTab: function (newValue, oldValue) {
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
      const isWriter = this.tabs[this.currentTab].id === 'tab-export-control'
      const isReader = this.tabs[this.currentTab].id === 'tab-import-control'
      let format
      // Loads a defaults file from main for the given state (tab + list item)
      if (isWriter) {
        format = Object.keys(WRITERS)[this.currentItem]
      } else if (isReader) {
        format = Object.keys(READERS)[this.currentItem]
      } else {
        console.warn('Should\'ve loaded defaults, but neither writers nor readers selected')
        return
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
      this.savingStatus = 'Saving ...' // TODO translate

      const isWriter = this.tabs[this.currentTab].id === 'tab-export-control'
      const isReader = this.tabs[this.currentTab].id === 'tab-import-control'

      let format
      if (isWriter) {
        format = Object.keys(WRITERS)[this.currentItem]
      } else if (isReader) {
        format = Object.keys(READERS)[this.currentItem]
      } else {
        console.warn('Should\'ve saved defaults, but neither writers nor readers selected')
        return
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
