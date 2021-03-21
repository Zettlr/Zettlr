<template>
  <div id="global-search-pane">
    <h4>Search</h4>
    <TextControl
      ref="query-input"
      v-model="query"
      v-bind:placeholder="'Find …'"
      v-on:confirm="startSearch()"
    ></TextControl>
    <!-- TODO: Allow to restrict to directories using an autocomplete input -->
    <ButtonControl
      v-if="searchResults.length > 0 && filesToSearch.length === 0"
      v-bind:label="'Clear search results'"
      v-on:click="emptySearchResults()"
    ></ButtonControl>
    <div v-if="filesToSearch.length > 0">
      <ProgressControl
        v-bind:max="sumFilesToSearch"
        v-bind:value="sumFilesToSearch - filesToSearch.length"
        v-bind:interruptible="true"
        v-on:interrupt="filesToSearch = []"
      ></ProgressControl>
    </div>
    <template v-if="searchResults.length > 0">
      <div
        v-for="result, idx in searchResults"
        v-bind:key="idx"
        class="search-result-container"
      >
        <span class="filename">{{ result.file.filename }}</span>
        <span class="filepath">{{ result.file.relativeDirectoryPath }}</span>
        <span
          v-for="singleRes, idx2 in result.result"
          v-bind:key="idx2"
          class="result-line"
          v-on:click="jumpToLine(result.file.path, singleRes.from.line)"
        >
          <strong>{{ singleRes.from.line }}</strong>:
          <span v-html="markText(singleRes.term, singleRes.restext)"></span>
        </span>
      </div>
    </template>
  </div>
</template>

<script>
import objectToArray from '../common/util/object-to-array'
import compileSearchTerms from '../common/util/compile-search-terms'
import TextControl from '../common/vue/form/elements/Text'
import ButtonControl from '../common/vue/form/elements/Button'
import ProgressControl from './Progress'
import { ipcRenderer } from 'electron'

export default {
  name: 'GlobalSearch',
  components: {
    TextControl,
    ProgressControl,
    ButtonControl
  },
  data: function () {
    return {
      query: '',
      searchInProgress: false,
      compiledTerms: null,
      searchIndex: -1,
      filesToSearch: [],
      searchResults: [],
      sumFilesToSearch: 0,
      // Is set to a line number if this component is waiting for a file to
      // become active.
      jtlIntent: undefined
    }
  },
  computed: {
    selectedDir: function () {
      return this.$store.state.selectedDirectory
    },
    fileTree: function () {
      return this.$store.state.fileTree
    },
    openFiles: function () {
      return this.$store.state.openFiles
    },
    activeFile: function () {
      return this.$store.state.activeFile
    },
    activeDocumentInfo: function () {
      return this.$store.state.activeDocumentInfo
    }
  },
  watch: {
    // We are sneaky here: The activeDocumentInfo is being updated *after* the
    // editor has completed switching to a new document. If we have a jtl
    // intent then, it is guaranteed that this means that our document has
    // finished loading and the editor is able to handle our request as it is
    // supposed to.
    activeDocumentInfo: function (newValue, oldValue) {
      // If we have an intention of jumping to a line,
      // do so and unset the intent again.
      if (this.jtlIntent !== undefined) {
        this.$emit('jtl', this.jtlIntent)
        this.jtlIntent = undefined
      }
    }
  },
  mounted: function () {
    this.$refs['query-input'].focus()
  },
  methods: {
    startSearch: function () {
      // We should start a search. We need two types of information for that:
      // 1. A list of files to be searched
      // 2. The compiled search terms.
      // Let's do that first.

      let fileList = []

      for (const treeItem of this.fileTree) {
        if (treeItem.type !== 'directory') {
          fileList.push({
            path: treeItem.path,
            relativeDirectoryPath: '',
            filename: treeItem.name
          })
          continue
        }

        let dirContents = objectToArray(treeItem, 'children')
        dirContents = dirContents.filter(item => item.type !== 'directory')
        dirContents = dirContents.map(item => {
          return {
            path: item.path,
            // Remove the workspace directory path itself so only the
            // app-internal relative path remains. Also, we're removing the leading (back)slash
            relativeDirectoryPath: item.dir.replace(treeItem.dir, '').substr(1),
            filename: item.name
          }
        })

        if (this.selectedDir.path.startsWith(treeItem.path) === true) {
          // Append the selected directory's contents BEFORE any other items
          // since that's probably something the user sees as more relevant.
          fileList = dirContents.concat(fileList)
        } else if (treeItem.type === 'directory') {
          fileList = fileList.concat(dirContents)
        }
      }

      // Now filter out all directories
      fileList = fileList.filter(item => item.type !== 'directory')

      if (fileList.length === 0) {
        return console.warn('Could not begin search: The file list was empty.')
      }

      this.compiledTerms = compileSearchTerms(this.query)

      // Now we're good to go!
      this.emptySearchResults()
      this.sumFilesToSearch = fileList.length
      this.filesToSearch = fileList
      this.searchInProgress = true
      this.singleSearchRun().catch(err => console.error(err))
    },
    singleSearchRun: async function () {
      // Take the file to be searched ...
      while (this.filesToSearch.length > 0) {
        const fileToSearch = this.filesToSearch.shift()
        // Now start the search
        const result = await ipcRenderer.invoke('application', {
          command: 'file-search',
          payload: {
            path: fileToSearch.path,
            terms: this.compiledTerms
          }
        })
        if (result.length > 0) {
          this.searchResults.push({
            file: fileToSearch,
            result: result
          })
        }
      }

      this.finaliseSearch()
    },
    finaliseSearch: function () {
      this.compiledTerms = null
      this.searchInProgress = false
      this.filesToSearch = [] // Reset, in case the search was aborted.
    },
    emptySearchResults: function () {
      this.searchResults = []
      // Also, for convenience, re-focus and select the input
      this.$refs['query-input'].focus()
      this.$refs['query-input'].select()
    },
    jumpToLine: function (filePath, lineNumber) {
      const isFileOpen = this.openFiles.find(file => file.path === filePath)
      const isActiveFile = (this.activeFile !== null) ? this.activeFile.path === filePath : false

      if (isActiveFile) {
        this.$emit('jtl', lineNumber)
      } else if (isFileOpen === undefined) {
        // The wanted file is not yet open --> open it and afterwards issue the
        // jtl-command
        ipcRenderer.invoke('application', {
          command: 'open-file',
          payload: filePath
        })
          .then(() => {
            // As soon as the file becomes active, jump to that line
            this.jtlIntent = lineNumber
          })
          .catch(e => console.error(e))
      } else {
        ipcRenderer.invoke('application', {
          command: 'set-active-file',
          payload: filePath
        })
          .then(() => {
            // As soon as the file becomes active, jump to that line
            this.jtlIntent = lineNumber
          })
          .catch(e => console.error(e))
      }
    },
    markText: function (term, result) {
      return result.replace(term, `<strong>${term}</strong>`)
    }
  }
}
</script>

<style lang="less">
body div#global-search-pane {
  padding: 10px;
  overflow: auto;
  height: 100%;

  div.search-result-container {
    border-bottom: 1px solid rgb(180, 180, 180);
    padding: 10px;
    overflow: hidden;

    span.filename {
      display: block;
      white-space: nowrap;
      font-weight: bold;
    }

    span.filepath {
      color: rgb(131, 131, 131);
      font-size: 11px;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      margin-bottom: 5px;
    }

    span.result-line {
      display: block;
      padding: 5px;

      &:hover {
        background-color: rgb(180, 180, 180);
      }
    }
  }
}

body.dark div#global-search-pane div.search-result-container span.result-line:hover {
  background-color: rgb(60, 60, 60);
}
</style>
