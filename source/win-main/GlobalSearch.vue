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
      v-on:keydown.tab="($refs['restrict-to-dir-input'] as any).focus()"
    ></AutocompleteText>
    <AutocompleteText
      ref="restrict-to-dir-input"
      v-model="restrictToDir"
      v-bind:label="restrictDirLabel"
      v-bind:autocomplete-values="directorySuggestions"
      v-bind:placeholder="restrictDirPlaceholder"
      v-on:confirm="restrictToDir = $event"
      v-on:keydown.enter="startSearch()"
    ></AutocompleteText>
    <!-- Then an always-visible search button ... -->
    <p>
      <ButtonControl
        v-bind:label="searchButtonLabel"
        v-bind:inline="true"
        v-on:click="startSearch()"
      ></ButtonControl>
    </p>
    <hr>
    <!-- ... as well as two buttons to clear the results or toggle them. -->
    <template v-if="searchResults.length > 0">
      <p style="text-align: center;">
        <ButtonControl
          v-if="filesToSearch.length === 0"
          v-bind:label="clearButtonLabel"
          v-bind:inline="true"
          v-on:click="emptySearchResults()"
        ></ButtonControl>
        <ButtonControl
          v-if="filesToSearch.length === 0"
          v-bind:label="toggleButtonLabel"
          v-bind:inline="true"
          v-on:click="toggleIndividualResults()"
        ></ButtonControl>
      </p>
      <p style="font-size: 14px; padding: 5px 0; text-align: center;">
        <span v-html="resultsMessage"></span>
      </p>
      <hr>
    </template>
    <!--
      During searching, display a progress bar that indicates how far we are and
      that allows to interrupt the search, if it takes too long.
    -->
    <template v-if="filesToSearch.length > 0">
      <div>
        <ProgressControl
          v-bind:max="sumFilesToSearch"
          v-bind:value="sumFilesToSearch - filesToSearch.length"
          v-bind:interruptible="true"
          v-on:interrupt="filesToSearch = []"
        ></ProgressControl>
      </div>
      <hr>
    </template>
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
            <cds-icon v-if="result.weight / maxWeight < 0.3" shape="dot-circle" style="fill: #aaaaaa"></cds-icon>
            <cds-icon v-else-if="result.weight / maxWeight < 0.7" shape="dot-circle" style="fill: #2975d9"></cds-icon>
            <cds-icon v-else shape="dot-circle" style="fill: #33aa33"></cds-icon>
            {{ result.file.displayName }}
          </div>

          <div class="collapse-icon">
            <cds-icon shape="angle" v-bind:direction="(result.hideResultSet) ? 'left' : 'down'"></cds-icon>
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
            <!-- NOTE how we have to increase the line number from zero-based to 1-based -->
            <span v-if="singleRes.line !== -1"><strong>{{ singleRes.line + 1 }}</strong>: </span>
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
import { type SearchResult, type SearchResultWrapper, type SearchTerm } from '@dts/common/search'
import { type DirDescriptor, type MDFileDescriptor } from '@dts/common/fsal'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { type AnyMenuItem } from '@dts/renderer/context'
import { hasMdOrCodeExt } from '@providers/fsal/util/is-md-or-code-file'
import { useOpenDirectoryStore, useWorkspacesStore } from './pinia'
import { mapStores } from 'pinia'

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
      label: trans('Open in a new tab'),
      id: 'new-tab',
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
  props: {
    windowId: {
      type: String,
      required: true
    }
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
      // The file list index of the most recently clicked search result.
      activeFileIdx: undefined as undefined|number,
      // The result line index of the most recently clicked search result.
      activeLineIdx: undefined as undefined|number
    }
  },
  computed: {
    ...mapStores(useWorkspacesStore),
    ...mapStores(useOpenDirectoryStore),
    recentGlobalSearches: function (): string[] {
      return this.$store.state.config['window.recentGlobalSearches']
    },
    selectedDir: function (): DirDescriptor|null {
      return this['open-directoryStore'].openDirectory
    },
    fileTree: function () {
      return this.workspacesStore.rootDescriptors
    },
    activeFile: function (): MDFileDescriptor|null {
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
      return trans('Full-Text Search')
    },
    resultsMessage: function () {
      return trans('%s matches', this.searchResults.length)
    },
    queryInputLabel: function () {
      return trans('Enter your search terms below')
    },
    queryInputPlaceholder: function () {
      return trans('Find …')
    },
    filterPlaceholder: function () {
      return trans('Filter …')
    },
    filterLabel: function () {
      return trans('Filter search results')
    },
    restrictDirLabel: function () {
      return trans('Restrict search to directory')
    },
    restrictDirPlaceholder: function () {
      return trans('Restrict to directory …')
    },
    searchButtonLabel: function () {
      return trans('Search')
    },
    clearButtonLabel: function () {
      return trans('Clear search')
    },
    toggleButtonLabel: function () {
      return trans('Toggle results')
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
          if (lineResult.restext.toLowerCase().includes(lowercase)) {
            return true
          }
        }

        // Next, try the different variations on filename and displayName
        if (result.file.filename.toLowerCase().includes(lowercase)) {
          return true
        }
        if (result.file.displayName.toLowerCase().includes(lowercase)) {
          return true
        }
        if (result.file.path.toLowerCase().includes(lowercase)) {
          return true
        }

        // No luck here.
        return false
      })
    }
  },
  watch: {
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
            displayName
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
            displayName
          }
        })

        if (this.selectedDir !== null && this.selectedDir.path.startsWith(treeItem.path)) {
          // Append the selected directory's contents BEFORE any other items
          // since that's probably something the user sees as more relevant.
          fileList = dirContents.concat(fileList)
        } else if (treeItem.type === 'directory') {
          fileList = fileList.concat(dirContents)
        }
      }

      // Filter out non-searchable files
      fileList = fileList.filter(file => hasMdOrCodeExt(file.path))

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
        const fileToSearch = this.filesToSearch.shift()
        // Now start the search
        const result: SearchResult[] = await ipcRenderer.invoke('application', {
          command: 'file-search',
          payload: {
            path: fileToSearch.path,
            terms
          }
        })

        if (result.length > 0) {
          const newResult: SearchResultWrapper = {
            file: fileToSearch,
            result,
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

      // Clear indices of active search result
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
        }
      })
    },
    onResultClick: function (event: MouseEvent, idx: number, idx2: number, filePath: string, lineNumber: number) {
      // This intermediary function is needed to make sure that jumpToLine can
      // also be called from within the context menu (see above).
      if (event.button === 2) {
        return // Do not handle right-clicks
      }

      // Update indices so we can keep track of the most recently clicked
      // search result.
      this.activeFileIdx = idx
      this.activeLineIdx = idx2

      const isMiddleClick = (event.type === 'mousedown' && event.button === 1)
      this.jumpToLine(filePath, lineNumber, isMiddleClick)
    },
    jumpToLine: function (filePath: string, lineNumber: number, openInNewTab: boolean = false) {
      // NOTE that we have to increase the line number for the JTL command
      this.$emit('jtl', filePath, lineNumber + 1, openInNewTab)
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

  hr { margin: 5px 0; }

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
        text-overflow: ellipsis;
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
