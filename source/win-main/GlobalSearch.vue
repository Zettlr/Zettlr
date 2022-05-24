<template>
  <div id="global-search-pane">
    <h4>{{ searchTitle }}</h4>
    <!-- First: Two text controls for search terms and to restrict the search -->
    <AutocompleteText
      ref="query-input"
      v-model="query"
      v-bind:label="queryInputLabel"
      v-bind:autocomplete-values="recentGlobalSearches"
      v-bind:placeholder="queryInputPlaceholder"
      v-on:keydown.enter="startSearch()"
    ></AutocompleteText>
    <AutocompleteText
      v-model="restrictToDir"
      v-bind:label="restrictDirLabel"
      v-bind:autocomplete-values="directorySuggestions"
      v-bind:placeholder="restrictDirPlaceholder"
      v-on:confirm="restrictToDir = $event"
      v-on:keydown.enter="startSearch()"
    ></AutocompleteText>
    <!-- Then an always-visible search button ... -->
    <ButtonControl
      v-bind:label="searchButtonLabel"
      v-bind:inline="true"
      v-on:click="startSearch()"
    ></ButtonControl>
    <!-- ... as well as two buttons to clear the results or toggle them. -->
    <ButtonControl
      v-if="searchResults.length > 0 && filesToSearch.length === 0"
      v-bind:label="clearButtonLabel"
      v-bind:inline="true"
      v-on:click="emptySearchResults()"
    ></ButtonControl>
    <ButtonControl
      v-if="searchResults.length > 0 && filesToSearch.length === 0"
      v-bind:label="toggleButtonLabel"
      v-bind:inline="true"
      v-on:click="toggleIndividualResults()"
    ></ButtonControl>
    <!--
      During searching, display a progress bar that indicates how far we are and
      that allows to interrupt the search, if it takes too long.
    -->
    <div v-if="filesToSearch.length > 0">
      <ProgressControl
        v-bind:max="sumFilesToSearch"
        v-bind:value="sumFilesToSearch - filesToSearch.length"
        v-bind:interruptible="true"
        v-on:interrupt="filesToSearch = []"
      ></ProgressControl>
    </div>
    <!-- Finally, display all search results, per file and line. -->
    <template v-if="searchResults.length > 0">
      <!-- First, display a filter ... -->
      <TextControl
        ref="filter"
        v-model="filter"
        v-bind:placeholder="filterPlaceholder"
        v-bind:label="filterLabel"
      ></TextControl>
      <!-- ... then the search results. -->
      <div
        v-for="result, idx in filteredSearchResults"
        v-bind:key="idx"
        class="search-result-container"
      >
        <div class="filename" v-on:click="result.hideResultSet = !result.hideResultSet">
          <!--
            NOTE: This DIV is just here due to the parent item's "display: flex",
            such that the filename plus indicator icon are floated to the left,
            while the collapse icon is floated to the right.
          -->
          <div class="overflow-hidden">
            <clr-icon v-if="result.weight / maxWeight < 0.3" shape="dot-circle" style="fill: #aaaaaa"></clr-icon>
            <clr-icon v-else-if="result.weight / maxWeight < 0.7" shape="dot-circle" style="fill: #2975d9"></clr-icon>
            <clr-icon v-else shape="dot-circle" style="fill: #33aa33"></clr-icon>
            {{ result.file.displayName }}
          </div>

          <div class="collapse-icon">
            <clr-icon v-bind:shape="(result.hideResultSet) ? 'caret left' : 'caret down'"></clr-icon>
          </div>
        </div>
        <div class="filepath">
          {{ result.file.relativeDirectoryPath }}{{ (result.file.relativeDirectoryPath !== '') ? sep : '' }}{{ result.file.filename }}
        </div>
        <div v-if="!result.hideResultSet" class="results-container">
          <div
            v-for="singleRes, idx2 in result.result"
            v-bind:key="idx2"
            class="result-line"
            v-bind:class="{'active': idx==activeFileIdx && idx2==activeLineIdx}"
            v-on:contextmenu.stop.prevent="fileContextMenu($event, result.file.path, singleRes.line)"
            v-on:mousedown.stop.prevent="onResultClick($event, idx, idx2, result.file.path, singleRes.line)"
          >
            <span v-if="singleRes.line !== -1"><strong>{{ singleRes.line }}</strong>: </span>
            <span v-html="markText(singleRes)"></span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GlobalSearch
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This component provides the global search functionality.
 *
 * END HEADER
 */

import objectToArray from '@common/util/object-to-array'
import compileSearchTerms from '@common/util/compile-search-terms'
import TextControl from '@common/vue/form/elements/Text.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import ProgressControl from '@common/vue/form/elements/Progress.vue'
import AutocompleteText from '@common/vue/form/elements/AutocompleteText.vue'
import { trans } from '@common/i18n-renderer'
import { defineComponent } from 'vue'
import { SearchResult, SearchResultWrapper, SearchTerm } from '@dts/common/search'
import { CodeFileMeta, DirMeta, MDFileMeta } from '@dts/common/fsal'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'

const path = window.path
const ipcRenderer = window.ipc

// Again: We have a side effect that trans() cannot be executed during import
// stage. It needs to be executed after the window registration ran for now. It
// will become better with the big refactoring that is currently underway since
// API methods will then be infused by the preload scripts so that trans will
// also work at the import stage.
function getContextMenu (): AnyMenuItem[] {
  return [
    {
      label: trans('menu.open_new_tab'),
      id: 'new-tab',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.quicklook'),
      id: 'open-quicklook',
      type: 'normal',
      enabled: true
    }
  ]
}

export default defineComponent({
  name: 'GlobalSearch',
  components: {
    TextControl,
    ProgressControl,
    ButtonControl,
    AutocompleteText
  },
  emits: ['jtl'],
  data: function () {
    return {
      // The current search
      query: '',
      // An additional query allowing search results to be filtered further
      filter: '',
      // Whether or not we should restrict search to a given directory
      restrictToDir: '',
      // All directories we've found in the file tree
      directorySuggestions: [] as string[],
      // The compiled search terms
      compiledTerms: null as null|SearchTerm[],
      // All files that we need to search. Will be emptied during a search.
      filesToSearch: [] as any[],
      // The number of files the search started with (for progress bar)
      sumFilesToSearch: 0,
      // A global trigger for the result set trigger. This will determine what
      // the toggle will do to all result sets -- either hide or display them.
      toggleState: false,
      // Contains the current search's maximum (combined) weight across the results
      maxWeight: 0,
      // Is set to a line number if this component is waiting for a file to
      // become active.
      jtlIntent: undefined as undefined|number,
      // The file list index of the most recently clicked search result.
      activeFileIdx: undefined as undefined|number,
      // The result line index of the most recently clicked search result.
      activeLineIdx: undefined as undefined|number
    }
  },
  computed: {
    recentGlobalSearches: function (): string[] {
      return this.$store.state.config['window.recentGlobalSearches']
    },
    selectedDir: function (): DirMeta|null {
      return this.$store.state.selectedDirectory
    },
    fileTree: function (): Array<MDFileMeta|CodeFileMeta|DirMeta> {
      return this.$store.state.fileTree
    },
    openFiles: function (): MDFileMeta[] {
      return this.$store.state.openFiles
    },
    activeFile: function (): MDFileMeta|null {
      return this.$store.state.activeFile
    },
    activeDocumentInfo: function (): any|null {
      return this.$store.state.activeDocumentInfo
    },
    useH1: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('heading')
    },
    useTitle: function (): boolean {
      return this.$store.state.config.fileNameDisplay.includes('title')
    },
    queryInputElement: function (): HTMLInputElement|null {
      return this.$refs['query-input'] as HTMLInputElement|null
    },
    searchTitle: function () {
      return trans('gui.global_search.title')
    },
    queryInputLabel: function () {
      return trans('gui.global_search.query_label')
    },
    queryInputPlaceholder: function () {
      return trans('gui.global_search.query_placeholder')
    },
    filterPlaceholder: function () {
      return trans('system.common.filter')
    },
    filterLabel: function () {
      return trans('gui.global_search.filter_label')
    },
    restrictDirLabel: function () {
      return trans('gui.global_search.restrict_dir_label')
    },
    restrictDirPlaceholder: function () {
      return trans('gui.global_search.restrict_dir_placeholder')
    },
    searchButtonLabel: function () {
      return trans('gui.global_search.search_label')
    },
    clearButtonLabel: function () {
      return trans('gui.global_search.clear_label')
    },
    toggleButtonLabel: function () {
      return trans('gui.global_search.toggle_label')
    },
    sep: function (): string {
      return path.sep
    },
    searchResults: function (): SearchResultWrapper[] {
      return this.$store.state.searchResults
    },
    /**
     * Allows search results to be further filtered
     */
    filteredSearchResults: function () {
      if (this.filter === '') {
        return this.searchResults
      }

      const lowercase = this.filter.toLowerCase()

      return this.searchResults.filter(result => {
        // First check the actual results in the files
        for (const lineResult of result.result) {
          if (lineResult.restext.toLowerCase().includes(lowercase) === true) {
            return true
          }
        }

        // Next, try the different variations on filename and displayName
        if (result.file.filename.toLowerCase().includes(lowercase) === true) {
          return true
        }
        if (result.file.displayName.toLowerCase().includes(lowercase) === true) {
          return true
        }
        if (result.file.path.toLowerCase().includes(lowercase) === true) {
          return true
        }

        // No luck here.
        return false
      })
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
    },
    fileTree: function () {
      this.recomputeDirectorySuggestions()
    }
  },
  mounted: function () {
    (this.$refs['query-input'] as HTMLInputElement).focus()
    this.recomputeDirectorySuggestions()
  },
  methods: {
    recomputeDirectorySuggestions: function () {
      let dirList: string[] = []

      for (const treeItem of this.fileTree) {
        if (treeItem.type !== 'directory') {
          continue
        }

        let dirContents = objectToArray(treeItem, 'children')
        dirContents = dirContents.filter(item => item.type === 'directory')
        // Remove the workspace directory path itself so only the
        // app-internal relative path remains. Also, we're removing the leading (back)slash
        dirList = dirList.concat(dirContents.map(item => item.path.replace(treeItem.dir, '').substr(1)))
      }

      // Remove duplicates
      this.directorySuggestions = [...new Set(dirList)]
    },
    setCurrentDirectory: function () {
      if (this.restrictToDir.trim() !== '') {
        return // Do not overwrite anything
      }

      // Immediately preset the restrictToDir with the currently selected directory
      if (this.selectedDir !== null) {
        // We cut off the origin of the root (i.e. the path of the containing root dir)
        let rootItem = this.selectedDir
        while (rootItem.parent != null) {
          rootItem = rootItem.parent as unknown as DirMeta
        }

        this.restrictToDir = this.selectedDir.path.replace(rootItem.dir, '').substring(1)
      }
    },
    startSearch: function () {
      // We should start a search. We need two types of information for that:
      // 1. A list of files to be searched
      // 2. The compiled search terms.
      // Let's do that first.

      let fileList: any[] = []

      for (const treeItem of this.fileTree) {
        if (treeItem.type !== 'directory') {
          let displayName = treeItem.name
          if (treeItem.type === 'file') {
            if (this.useTitle && typeof treeItem.frontmatter?.title === 'string') {
              displayName = treeItem.frontmatter.title
            } else if (this.useH1 && treeItem.firstHeading !== null) {
              displayName = treeItem.firstHeading
            }
          }

          fileList.push({
            path: treeItem.path,
            relativeDirectoryPath: '',
            filename: treeItem.name,
            displayName: displayName
          })
          continue
        }

        let dirContents = objectToArray(treeItem, 'children')
        dirContents = dirContents.filter(item => item.type !== 'directory')
        dirContents = dirContents.map(item => {
          let displayName = item.name
          if (this.useTitle && item.frontmatter != null && typeof item.frontmatter.title === 'string') {
            displayName = item.frontmatter.title
          } else if (this.useH1 && item.firstHeading !== null) {
            displayName = item.firstHeading
          }

          return {
            path: item.path,
            // Remove the workspace directory path itself so only the
            // app-internal relative path remains. Also, we're removing the leading (back)slash
            relativeDirectoryPath: item.dir.replace(treeItem.dir, '').substr(1),
            filename: item.name,
            displayName: displayName
          }
        })

        if (this.selectedDir !== null && this.selectedDir.path.startsWith(treeItem.path) === true) {
          // Append the selected directory's contents BEFORE any other items
          // since that's probably something the user sees as more relevant.
          fileList = dirContents.concat(fileList)
        } else if (treeItem.type === 'directory') {
          fileList = fileList.concat(dirContents)
        }
      }

      // And also all files that are not within the selected directory
      if (this.restrictToDir.trim() !== '') {
        fileList = fileList.filter(item => item.relativeDirectoryPath.startsWith(this.restrictToDir))
      }

      if (fileList.length === 0) {
        return console.warn('Could not begin search: The file list was empty.')
      }

      this.compiledTerms = compileSearchTerms(this.query)

      // One last thing: Add the query to the recent searches
      const recentSearches: string[] = this.$store.state.config['window.recentGlobalSearches']

      const idx = recentSearches.indexOf(this.query)

      if (idx > -1) {
        recentSearches.splice(idx, 1)
      }

      recentSearches.unshift(this.query)
      ;(global as any).config.set('window.recentGlobalSearches', recentSearches.slice(0, 10))

      // Now we're good to go!
      this.emptySearchResults()
      this.blurQueryInput()
      this.filter = '' // Reset the filter
      this.sumFilesToSearch = fileList.length
      this.filesToSearch = fileList
      this.maxWeight = 0
      this.singleSearchRun().catch(err => console.error(err))
    },
    singleSearchRun: async function () {
      // Take the file to be searched ...
      const terms = compileSearchTerms(this.query)
      while (this.filesToSearch.length > 0) {
        const fileToSearch = this.filesToSearch.shift() as any
        // Now start the search
        const result: SearchResult[] = await ipcRenderer.invoke('application', {
          command: 'file-search',
          payload: {
            path: fileToSearch.path,
            terms: terms
          }
        })
        if (result.length > 0) {
          const newResult: SearchResultWrapper = {
            file: fileToSearch,
            result: result,
            hideResultSet: false, // If true, the individual results won't be displayed
            weight: result.reduce((accumulator: number, currentValue: SearchResult) => {
              return accumulator + currentValue.weight
            }, 0) // This is the initialValue, b/c we're summing up props
          }
          this.$store.commit('addSearchResult', newResult)
          if (newResult.weight > this.maxWeight) {
            this.maxWeight = newResult.weight
          }
        }
      }

      this.finaliseSearch()
    },
    finaliseSearch: function () {
      this.compiledTerms = null
      this.filesToSearch = [] // Reset, in case the search was aborted.
    },
    emptySearchResults: function () {
      this.$store.commit('clearSearchResults')

      // Clear indeces of active search result
      this.activeFileIdx = -1
      this.activeLineIdx = -1

      // Also, for convenience, re-focus and select the input if available
      this.queryInputElement?.focus()
      this.queryInputElement?.select()
    },
    toggleIndividualResults: function () {
      this.toggleState = !this.toggleState
      for (const result of this.searchResults) {
        result.hideResultSet = this.toggleState
      }
    },
    fileContextMenu: function (event: MouseEvent, filePath: string, lineNumber: number) {
      const point = { x: event.clientX, y: event.clientY }
      showPopupMenu(point, getContextMenu(), (clickedID: string) => {
        switch (clickedID) {
          case 'new-tab':
            this.jumpToLine(filePath, lineNumber, true)
            break
          case 'open-quicklook':
            ipcRenderer.invoke('application', {
              command: 'open-quicklook',
              payload: filePath
            })
              .catch(e => console.error(e))
            break
        }
      })
    },
    onResultClick: function (event: MouseEvent, idx: number, idx2: number, filePath: string, lineNumber: number) {
      // This intermediary function is needed to make sure that jumpToLine can
      // also be called from within the context menu (see above).
      if (event.button === 2) {
        return // Do not handle right-clicks
      }

      // Update indeces so we can keep track of the most recently clicked
      // search result.
      this.activeFileIdx = idx
      this.activeLineIdx = idx2

      const isMiddleClick = (event.type === 'mousedown' && event.button === 1)
      this.jumpToLine(filePath, lineNumber, isMiddleClick)
    },
    jumpToLine: function (filePath: string, lineNumber: number, openInNewTab: boolean = false) {
      const isActiveFile = (this.activeFile !== null) ? this.activeFile.path === filePath : false

      if (isActiveFile) {
        this.$emit('jtl', lineNumber)
      } else {
        // The wanted file is not yet active -> Do so and then jump to the correct line
        ipcRenderer.invoke('application', {
          command: 'open-file',
          payload: {
            path: filePath,
            newTab: openInNewTab // Open in a new tab if wanted
          }
        })
          .then(() => {
            // As soon as the file becomes active, jump to that line. But only
            // if it's >= 0. If lineNumber === -1 it means just the file should
            // be open.
            if (lineNumber >= 0) {
              this.jtlIntent = lineNumber
            }
          })
          .catch(e => console.error(e))
      }
    },
    markText: function (resultObject: SearchResult) {
      const startTag = '<span class="search-result-highlight">'
      const endTag = '</span>'
      // We receive a result object and should return an HTML string containing
      // highlighting (we're using <strong>) where the result works. We have
      // access to restext, weight, line, and an array of from-to-ranges
      // indicating all matches on the given line. NOTE that all results are
      // being sorted correctly by the main process, so we can just assume the
      // results to be non-overlapping and from beginning to the end of the
      // line.
      let marked = resultObject.restext

      // We go through the ranges in reverse order so that the range positions
      // remain valid as we highlight parts of the string
      for (let i = resultObject.ranges.length - 1; i > -1; i--) {
        const range = resultObject.ranges[i]
        marked = marked.substring(0, range.to) + endTag + marked.substring(range.to)
        marked = marked.substring(0, range.from) + startTag + marked.substring(range.from)
      }

      return marked
    },
    focusQueryInput: function () {
      this.queryInputElement?.focus()
    },
    blurQueryInput: function () {
      this.queryInputElement?.blur()
    }
  }
})
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
    font-size: 14px;

    div.filename {
      white-space: nowrap;
      font-weight: bold;
      display: flex;
      justify-content: space-between;

      div.overflow-hidden {
        overflow: hidden;
      }
    }

    div.filepath {
      color: rgb(131, 131, 131);
      font-size: 10px;
      white-space: nowrap;
      overflow: hidden;
      margin-bottom: 5px;
    }

    div.result-line {
      padding: 5px;
      font-size: 12px;

      &:hover {
        background-color: rgb(180, 180, 180);
      }

      .search-result-highlight {
        font-weight: bold;
        color: var(--system-accent-color);
      }
    }

    div.active {
      background-color: rgb(160, 160, 160);
    }
  }
}

body.dark div#global-search-pane div.search-result-container div.result-line:hover {
  background-color: rgb(60, 60, 60);
}

body.dark div#global-search-pane div.search-result-container div.active {
  background-color: rgb(100, 100, 100);
}
</style>
