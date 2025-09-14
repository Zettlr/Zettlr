<template>
  <div id="global-search-pane">
    <h4>{{ searchTitle }}</h4>
    <!-- First: Two text controls for search terms and to restrict the search -->
    <AutocompleteText
      ref="queryInputElement"
      v-model="query"
      name="query-input"
      v-bind:label="queryInputLabel"
      v-bind:autocomplete-values="recentGlobalSearches"
      v-bind:placeholder="queryInputPlaceholder"
      v-on:keydown.enter="startSearch()"
    ></AutocompleteText>
    <AutocompleteText
      ref="restrict-to-dir-input"
      v-model="restrictToDir"
      name="restrict-to-dir-input"
      v-bind:label="restrictDirLabel"
      v-bind:autocomplete-values="directorySuggestions"
      v-bind:placeholder="restrictDirPlaceholder"
      v-on:keydown.enter="startSearch()"
    ></AutocompleteText>
    <!-- Then an always-visible search button ... -->
    <p>
      <ButtonControl
        v-bind:label="searchButtonLabel"
        v-bind:inline="true"
        v-bind:disabled="false"
        v-on:click="startSearch()"
      ></ButtonControl>
      <ButtonControl
        v-bind:label="cancelButtonLabel"
        v-bind:inline="true"
        v-bind:disabled="!searchIsRunning"
        v-on:click="cancelSearch()"
      ></ButtonControl>
    </p>
    <!-- ... as well as two buttons to clear the results or toggle them. -->
    <template v-if="searchResults.length > 0">
      <hr>
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
    <template v-if="searchIsRunning">
      <div>
        <ProgressControl
          v-bind:max="sumFilesToSearch"
          v-bind:value="sumFilesToSearch - filesToSearch.length"
          v-bind:interruptible="true"
          v-on:interrupt="cancelSearch()"
        ></ProgressControl>
      </div>
      <hr>
    </template>
    <!-- Finally, display all search results, per file and line. -->
    <template v-if="searchResults.length > 0">
      <!-- First, display a filter ... -->
      <TextControl
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
            v-on:contextmenu.stop.prevent="fileContextMenu($event, result.file.path, singleRes.line, singleRes.restext)"
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

<script setup lang="ts">
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
import TextControl from '@common/vue/form/elements/TextControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import ProgressControl from '@common/vue/form/elements/ProgressControl.vue'
import AutocompleteText from '@common/vue/form/elements/AutocompleteText.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed, watch, onMounted } from 'vue'
import type { FileSearchDescriptor, SearchResult, SearchResultWrapper } from '@dts/common/search'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { hasMdOrCodeExt } from '@common/util/file-extention-checks'
import { useConfigStore, useWindowStateStore, useWorkspacesStore } from 'source/pinia'
import type { MaybeRootDescriptor } from 'source/types/common/fsal'

const ipcRenderer = window.ipc

const sep = process.platform === 'win32' ? '\\': '/'

const searchTitle = trans('Search across all files')
const queryInputLabel = trans('Enter your search terms below')
const queryInputPlaceholder = trans('Find…')
const filterPlaceholder = trans('Filter…')
const filterLabel = trans('Filter search results')
const restrictDirLabel = trans('Restrict search to directory')
const restrictDirPlaceholder = trans('Choose directory…')
const searchButtonLabel = trans('Search')
const cancelButtonLabel = trans('Cancel')
const clearButtonLabel = trans('Clear search')
const toggleButtonLabel = trans('Toggle results')

// Again: We have a side effect that trans() cannot be executed during import
// stage. It needs to be executed after the window registration ran for now. It
// will become better with the big refactoring that is currently underway since
// API methods will then be infused by the preload scripts so that trans will
// also work at the import stage.
function getContextMenu (): AnyMenuItem[] {
  return [
    {
      label: trans('Open in new tab'),
      id: 'new-tab',
      type: 'normal'
    },
    {
      label: trans('Copy'),
      id: 'copy',
      type: 'normal'
    }
  ]
}

defineProps<{
  windowId: string
}>()

const emit = defineEmits<(e: 'jtl', filePath: string, lineNumber: number, openInNewTab: boolean) => void>()

// The current search
const query = ref<string>('')
// An additional query allowing search results to be filtered further
const filter = ref<string>('')
// Whether or not we should restrict search to a given directory
const restrictToDir = ref<string>('')
// All directories we've found in the file tree
const directorySuggestions = ref<string[]>([])
// All files that we need to search. Will be emptied during a search.
const filesToSearch = ref<FileSearchDescriptor[]>([])
// The number of files the search started with (for progress bar)
const sumFilesToSearch = ref<number>(0)
// A global trigger for the result set trigger. This will determine what
// the toggle will do to all result sets -- either hide or display them.
const toggleState = ref<boolean>(false)
// Contains the current search's maximum (combined) weight across the results
const maxWeight = ref<number>(0)
// The file list index of the most recently clicked search result.
const activeFileIdx = ref<undefined|number>(undefined)
// The result line index of the most recently clicked search result.
const activeLineIdx = ref<undefined|number>(undefined)

const workspacesStore = useWorkspacesStore()
const configStore = useConfigStore()
const windowStateStore = useWindowStateStore()

const recentGlobalSearches = computed(() => configStore.config.window.recentGlobalSearches)

const fileTree = computed(() => workspacesStore.rootDescriptors)
const useH1 = computed(() => configStore.config.fileNameDisplay.includes('heading'))
const useTitle = computed(() => configStore.config.fileNameDisplay.includes('title'))
const queryInputElement = ref<HTMLInputElement|null>(null)

const searchResults = computed(() => {
  // NOTE: Vue's reactivity can be tricky, and one thing is to sort arrays.
  // This is why we first clone them, sort the cloned array and return that one.
  const results = [...windowStateStore.searchResults]
  return results.sort((a, b) => b.weight - a.weight)
})

const resultsMessage = computed<string>(() => {
  const nMatches = searchResults.value
    .map(x => x.result.length)
    .reduce((prev, cur) => prev + cur, 0)
  const nFiles = searchResults.value.length
  return trans('%s matches across %s files', nMatches, nFiles)
})

/**
 * Allows search results to be further filtered
 */
const filteredSearchResults = computed<SearchResultWrapper[]>(() => {
  if (filter.value === '') {
    return searchResults.value
  }

  const lowercase = filter.value.toLowerCase()

  return searchResults.value.filter(result => {
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
})

const searchIsRunning = computed(() => { return filesToSearch.value.length > 0 })
const shouldStartNewSearch = ref<boolean>(false)

watch(fileTree, () => {
  recomputeDirectorySuggestions()
})

onMounted(() => {
  queryInputElement.value?.focus()
  recomputeDirectorySuggestions()
})

function recomputeDirectorySuggestions (): void {
  let dirList: string[] = []

  for (const treeItem of fileTree.value) {
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
  directorySuggestions.value = [...new Set(dirList)]
}

function startSearch (overrideQuery?: string): void {
  // This allows other components to inject a new query when starting a search
  if (overrideQuery !== undefined) {
    query.value = overrideQuery
  }

  if (searchIsRunning.value) {
    cancelSearch(true)
    return
  }

  // We should start a search. We need two types of information for that:
  // 1. A list of files to be searched
  // 2. The compiled search terms.
  // Let's do that first.

  let fileList: FileSearchDescriptor[] = []

  for (const treeItem of fileTree.value) {
    if (treeItem.type !== 'directory') {
      let displayName = treeItem.name
      if (treeItem.type === 'file') {
        if (useTitle.value && typeof treeItem.frontmatter?.title === 'string') {
          displayName = treeItem.frontmatter.title
        } else if (useH1.value && treeItem.firstHeading !== null) {
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

    const dirContents = objectToArray<MaybeRootDescriptor>(treeItem, 'children')
      .filter(item => item.type !== 'directory')
      .map(item => {
        let displayName = item.name
        if (item.type === 'file') {
          if (useTitle.value && item.frontmatter != null && typeof item.frontmatter.title === 'string') {
            displayName = item.frontmatter.title
          } else if (useH1.value && item.firstHeading !== null) {
            displayName = item.firstHeading
          }
        }

        return {
          path: item.path,
          // Remove the workspace directory path itself so only the
          // app-internal relative path remains. Also, we're removing the leading (back)slash
          relativeDirectoryPath: item.dir.replace(treeItem.dir, '').substring(1),
          filename: item.name,
          displayName
        }
      })

    if (treeItem.type === 'directory') {
      fileList = fileList.concat(dirContents)
    }
  }

  // Filter out non-searchable files
  fileList = fileList.filter(file => hasMdOrCodeExt(file.path))

  // And also all files that are not within the selected directory
  if (restrictToDir.value.trim() !== '') {
    fileList = fileList.filter(item => item.relativeDirectoryPath.startsWith(restrictToDir.value))
  }

  if (fileList.length === 0) {
    return console.warn('Could not begin search: The file list was empty.')
  }

  // One last thing: Add the query to the recent searches
  const recentSearches: string[] = recentGlobalSearches.value.map(x => x)

  const idx = recentSearches.indexOf(query.value)

  if (idx > -1) {
    recentSearches.splice(idx, 1)
  }

  recentSearches.unshift(query.value)
  // TODO: Refactor to use pinia's config store instead!
  ;(global as any).config.set('window.recentGlobalSearches', recentSearches.slice(0, 10))

  // Now we're good to go!
  emptySearchResults()
  blurQueryInput()
  filter.value = '' // Reset the filter
  sumFilesToSearch.value = fileList.length
  filesToSearch.value = fileList
  maxWeight.value = 0
  singleSearchRun().catch(err => console.error(err))
}

async function singleSearchRun (): Promise<void> {
  // Take the file to be searched ...
  const terms = compileSearchTerms(query.value)
  let fileToSearch: FileSearchDescriptor|undefined
  while ((fileToSearch = filesToSearch.value.shift()) !== undefined) {
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
      windowStateStore.searchResults.push(newResult)
      if (newResult.weight > maxWeight.value) {
        maxWeight.value = newResult.weight
      }
    }
  }

  finaliseSearch()
}

function cancelSearch (startNewSearch: boolean = false): void {
  filesToSearch.value = []
  shouldStartNewSearch.value = startNewSearch
}

function finaliseSearch (): void {
  filesToSearch.value = [] // Reset, in case the search was aborted.
  if (shouldStartNewSearch.value) {
    shouldStartNewSearch.value = false
    startSearch()
  }
}

function emptySearchResults (): void {
  windowStateStore.searchResults = []

  // Clear indices of active search result
  activeFileIdx.value = -1
  activeLineIdx.value = -1

  // Also, for convenience, re-focus and select the input if available
  queryInputElement.value?.focus()
  queryInputElement.value?.select()
}

function toggleIndividualResults (): void {
  toggleState.value = !toggleState.value
  for (const result of searchResults.value) {
    result.hideResultSet = toggleState.value
  }
}

function fileContextMenu (event: MouseEvent, filePath: string, lineNumber: number, restext: string): void {
  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, getContextMenu(), (clickedID: string) => {
    switch (clickedID) {
      case 'new-tab':
        jumpToLine(filePath, lineNumber, true)
        break
      case 'copy':
        navigator.clipboard.writeText(restext).catch(err => console.error(err))
        break
    }
  })
}

function onResultClick (event: MouseEvent, idx: number, idx2: number, filePath: string, lineNumber: number): void {
  // This intermediary function is needed to make sure that jumpToLine can
  // also be called from within the context menu (see above).
  if (event.button === 2) {
    return // Do not handle right-clicks
  }

  // Update indices so we can keep track of the most recently clicked
  // search result.
  activeFileIdx.value = idx
  activeLineIdx.value = idx2

  const isMiddleClick = (event.type === 'mousedown' && event.button === 1)
  jumpToLine(filePath, lineNumber, isMiddleClick)
}

function jumpToLine (filePath: string, lineNumber: number, openInNewTab: boolean = false): void {
  // NOTE that we have to increase the line number for the JTL command
  emit('jtl', filePath, lineNumber + 1, openInNewTab)
}

function markText (resultObject: SearchResult): string {
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
}

function focusQueryInput (): void {
  queryInputElement.value?.focus()
}

function blurQueryInput (): void {
  queryInputElement.value?.blur()
}

defineExpose({ focusQueryInput, blurQueryInput, startSearch })
</script>

<style lang="less">
body div#global-search-pane {
  padding: 10px;
  overflow: auto;
  height: 100%;

  hr {
    margin: 10px 0;
    border: none;
    border-bottom: 1px solid #ccc;
  }

  p {
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .form-control {
    input {
      margin-top: 5px;
    }
  }

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
