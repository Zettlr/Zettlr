<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Defaults'"
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
          Edit the corresponding defaults file here.
          <CodeEditor
            ref="code-editor"
            v-model="editorContents"
            v-bind:mode="'yaml'"
          ></CodeEditor>
          <ButtonControl
            v-bind:primary="true"
            v-bind:label="'Save'"
            v-on:click="saveDefaultsFile()"
          ></ButtonControl>
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
// TODO
import CodeEditor from '../win-custom-css/CodeEditor'
import { ipcRenderer } from 'electron'
import YAML from 'yaml'

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
      editorContents: ''
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
      // TODO: Possibly different values for import and export!
      return Object.values(WRITERS)
    }
  },
  watch: {
    currentTab: function (newValue, oldValue) {
      this.loadDefaultsForState()
    },
    currentItem: function (newValue, oldValue) {
      this.loadDefaultsForState()
    }
  },
  mounted: function () {
    this.loadDefaultsForState()
  },
  methods: {
    loadDefaultsForState: function () {
      // Loads a defaults file from main for the given state (tab + list item)
      const writer = Object.keys(WRITERS)[this.currentItem]

      ipcRenderer.invoke('assets-provider', {
        command: 'get-defaults-file',
        payload: writer
      })
        .then(data => {
          // The data is a simple object, which we need to transform into YAML
          const yaml = YAML.stringify(data)
          this.editorContents = yaml
        })
        .catch(err => console.error(err))
    },
    saveDefaultsFile: function () {
      const writer = Object.keys(WRITERS)[this.currentItem]
      const data = YAML.parseDocument(this.editorContents)
      console.log('Saving data: ', this.editorContents)

      ipcRenderer.invoke('assets-provider', {
        command: 'set-defaults-file',
        payload: {
          writer: writer,
          contents: data
        }
      })
        .catch(err => console.error(err))
    }
  }
}
</script>

<style lang="less">
//
</style>
