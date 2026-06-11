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

    <CheckboxControl
      v-model="caseInsensitive"
      v-bind:label="caseInsensitiveLabel"
      v-bind:name="'full-text-search-case-toggle'"
      style="margin: 0px"
    ></CheckboxControl>

    <AutocompleteText
      ref="restrict-to-dir-input"
      v-model="restrictToDir"
      name="restrict-to-dir-input"
      v-bind:label="restrictDirLabel"
      v-bind:autocomplete-values="directorySuggestions.map(s => s.displayValue)"
      v-bind:placeholder="restrictDirPlaceholder"
      v-on:keydown.enter="startSearch()"
    ></AutocompleteText>
    <!-- Then an always-visible search button ... -->
    <p>
      <ButtonControl
        v-bind:label="searchButtonLabel"
        v-bind:inline="true"
        v-bind:disabled="searchIsRunning"
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
    <template v-if="windowStateStore.searchResults.length > 0">
      <template v-if="!searchIsRunning">
        <hr>
        <p>
          <ButtonControl
            v-bind:label="clearButtonLabel"
            v-bind:inline="true"
            v-on:click="emptySearchResults()"
          ></ButtonControl>
          <ButtonControl
            v-bind:label="toggleButtonLabel"
            v-bind:inline="true"
            v-on:click="toggleIndividualResults()"
          ></ButtonControl>
        </p>
      </template>
      <hr>
      <p style="padding: 5px 0; text-align: center; display: block;">
        {{ resultsMessage }}
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
          v-bind:max="1"
          v-bind:value="searchProgress"
          v-bind:interruptible="true"
          v-on:interrupt="cancelSearch()"
        ></ProgressControl>
      </div>
      <hr>
    </template>
    <!-- Finally, display all search results, per file and line. -->
    <template v-if="filteredSearchResults.length > 0 && !searchIsRunning">
      <!-- First, display a filter ... -->
      <TextControl
        v-model="filter"
        v-bind:placeholder="filterPlaceholder"
        v-bind:label="filterLabel"
      ></TextControl>
      <!-- ... then the search results. NOTE: The 34px minimum size are purely empirical, and will be overridden with the actually measured size. -->
      <DynamicScroller
        v-bind:items="filteredSearchResults"
        v-bind:min-item-size="34"
        v-bind:key-field="'key'"
        v-bind:disable-transform="true"
        v-bind:page-mode="true"
        class="search-result-container"
      >
        <template #default="{ item, index, active }">
          <DynamicScrollerItem
            v-bind:item="item"
            v-bind:active="active"
            class="single-search-result"
          >
            <div class="result-header" v-on:click="item.hideResultSet = !item.hideResultSet">
              <cds-icon shape="dot-circle" v-bind:style="`fill: ${getRelevancyColor(item)}`" class="relevancy-icon"></cds-icon>
              <span class="filename">{{ item.file.displayName }}</span>
              <cds-icon class="collapse-indicator" shape="angle" v-bind:direction="(item.hideResultSet) ? 'left' : 'down'"></cds-icon>
              <span class="filepath">{{ item.file.relativeDirectoryPath }}</span>
            </div>

            <div v-if="!item.hideResultSet" class="results-container">
              <template
                v-for="singleRes, idx2 in item.result"
                v-bind:key="idx2"
              >
                <div
                  class="result-line"
                  v-bind:class="{ active: index === activeFileIdx && idx2 === activeLineIdx }"
                  v-on:contextmenu.stop.prevent="fileContextMenu($event, item.file.path, singleRes)"
                  v-on:mousedown.stop.prevent="onResultClick($event, index, idx2, item.file.path, singleRes.type === 'content' ? singleRes.line : 1)"
                >
                  <span class="line-number"><strong>{{ singleRes.type === 'content' ? singleRes.line : 1 }}</strong>: </span>
                  <!-- eslint-disable-next-line vue/no-v-html NOTE: We can disable the v-html error here, since markText runs DOMPurify over the data, and we have to allow HTML tags to mark the elements. -->
                  <span v-if="singleRes.type === 'content'" class="excerpt" v-html="markText(singleRes)"></span>
                </div>
              </template>
            </div>
          </DynamicScrollerItem>
        </template>
      </DynamicScroller>
    </template>
    <template v-else-if="!searchIsRunning && hadNoResult">
      <hr>
      <p style="text-align: center; display: block;">
        {{ noResultsMessage }}
      </p>
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

import TextControl from '@common/vue/form/elements/TextControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import ProgressControl from '@common/vue/form/elements/ProgressControl.vue'
import AutocompleteText from '@common/vue/form/elements/AutocompleteText.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed, onMounted, watch } from 'vue'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { useConfigStore, useWindowStateStore, useWorkspaceStore } from 'source/pinia'
import { pathBasename, pathDirname, relativePath } from 'source/common/util/renderer-path-polyfill'
import { sanitizeHTML } from 'source/common/util/sanitize-html'
import type { SearchProviderIPCAPI, SearchResult, FileContentSearchResult } from 'source/app/service-providers/search'
import CheckboxControl from 'source/common/vue/form/elements/CheckboxControl.vue'
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller'
import type { MetadataSearchResult } from 'source/app/service-providers/search/util/boolean-search'

/**
 * This interface describes a specific descriptor for use during file searches
 */
interface FileSearchDescriptor {
  path: string
  relativeDirectoryPath: string
  filename: string
  displayName: string
}

/**
 * This interface describes a wrapper that combines search results with metadata
 * on the file the results describe
 */
export interface SearchResultWrapper {
  key: string
  file: FileSearchDescriptor
  result: SearchResult
  hideResultSet: boolean
  weight: number
}

const ipcRenderer = window.ipc

const searchTitle = trans('Search across all files')
const queryInputLabel = trans('Enter your search terms below')
const queryInputPlaceholder = trans('Find…')
const filterPlaceholder = trans('Filter…')
const filterLabel = trans('Filter search results')
const restrictDirLabel = trans('Restrict search to directory')
const caseInsensitiveLabel = trans('Case insensitive')
const restrictDirPlaceholder = trans('Choose directory…')
const searchButtonLabel = trans('Search')
const cancelButtonLabel = trans('Cancel')
const clearButtonLabel = trans('Clear search')
const toggleButtonLabel = trans('Toggle results')
const noResultsMessage = trans('No results for your search.')

// Again: We have a side effect that trans() cannot be executed during import
// stage. It needs to be executed after the window registration ran for now. It
// will become better with the big refactoring that is currently underway since
// API methods will then be infused by the preload scripts so that trans will
// also work at the import stage.
function getContextMenu (canCopyText = true): AnyMenuItem[] {
  return [
    {
      label: trans('Open in new tab'),
      id: 'new-tab',
      type: 'normal'
    },
    {
      label: trans('Copy'),
      id: 'copy',
      type: 'normal',
      enabled: canCopyText
    }
  ]
}

function getRelevancyColor (item: SearchResultWrapper): string {
  if (item.weight / windowStateStore.maxSearchResultWeight < 0.3) {
    return '#aaaaaa'
  } else if(item.weight / windowStateStore.maxSearchResultWeight < 0.7) {
    return '#2975d9'
  } else {
    return '#33aa33'
  }
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
// Whether this search should be case insensitive
const caseInsensitive = ref<boolean>(true)
// Search result progress
const searchProgress = ref(0)
// Whether the last search had no result
const hadNoResult = ref(false)
// A global trigger for the result set trigger. This will determine what
// the toggle will do to all result sets -- either hide or display them.
const toggleState = ref<boolean>(false)
// The file list index of the most recently clicked search result.
const activeFileIdx = ref<undefined|number>(undefined)
// The result line index of the most recently clicked search result.
const activeLineIdx = ref<undefined|number>(undefined)

const searchIsRunning = ref<boolean>(false)
const shouldStartNewSearch = ref<boolean>(false)

const workspaceStore = useWorkspaceStore()
const configStore = useConfigStore()
const windowStateStore = useWindowStateStore()

const recentGlobalSearches = computed(() => configStore.config.window.recentGlobalSearches)

const queryInputElement = ref<HTMLInputElement|null>(null)

// All directories we've found in the file tree. NOTE: The search function
// expects "workspace-relative" paths here. This has two reasons: (a) It removes
// unnecessary paths segments before the workspace start, and (b) it makes the
// list easier to parse. The remainder of the global search expects these
// workspace-relative paths.
// Example: We have a workspace loaded at /home/zettlr/Documents/my-workspace
// which contains two folders "assets" and "My Project". This function will
// return a list with "my-workspace", "my-workspace/assets" and
// "my-workspace/My Project".
const directorySuggestions = computed<Array<{ absPath: string, displayValue: string }>>(() => {
  const suggestedDirectories: Array<{ absPath: string, displayValue: string }> = []
  for (const [ rootPath, dirPaths ] of workspaceStore.workspaceMap.entries()) {
    const rootDir = pathDirname(rootPath)
    const wsRelativePaths = dirPaths
      // Map paths to descriptors
      .map(p => workspaceStore.descriptorMap.get(p))
      // Only retain directories
      .filter(d => d !== undefined && d.type === 'directory')
      // Map from absolute to workspace-relative paths
      .map(d => ({ absPath: d.path, displayValue: d.path.slice(rootDir.length + 1) }))
      // Filter empty ones
      .filter(p => p.displayValue.length > 0)
    
    suggestedDirectories.push(...wsRelativePaths)
  }
  return suggestedDirectories
})

const resultsMessage = computed<string>(() => {
  const nMatches = windowStateStore.searchResults
    .map(x => x.result.length)
    .reduce((prev, cur) => prev + cur, 0)
  const nFiles = windowStateStore.searchResults.length
  return trans('%s matches across %s files', nMatches, nFiles)
})

/**
 * Allows search results to be further filtered
 */
const filteredSearchResults = computed<SearchResultWrapper[]>(() => {
  const matchedResults = windowStateStore.searchResults.filter(r => r.result.length > 0)
  if (filter.value === '') {
    return matchedResults
  }

  const lowercase = filter.value.toLowerCase()

  return matchedResults
    .filter(result => {
      for (const r of result.result) {
        if (r.type === 'content' && r.excerpt.toLowerCase().includes(lowercase) === true) {
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
})

// Changing the query should reset the no-results message
watch(query, () => { hadNoResult.value = false })

onMounted(() => {
  queryInputElement.value?.focus()

  ipcRenderer.on('search-provider', (event, message) => {
    if (message.type === 'search-end') {
      searchIsRunning.value = false
      hadNoResult.value = filteredSearchResults.value.length === 0
      searchProgress.value = 0
    } else if (message.type === 'search-result') {
      processSearchResult(message.progress as number, message.file as string, message.result as SearchResult|undefined)
        .catch(err => console.error(err))
    }
  })
})

/**
 * Starts a new search
 *
 * @param  {string}  overrideQuery  Optional property that can be used to
 *                                  programmatically set a search.
 */
function startSearch (overrideQuery?: string): void {
  // This allows other components to inject a new query when starting a search
  if (overrideQuery !== undefined) {
    query.value = overrideQuery
  }

  if (searchIsRunning.value) {
    cancelSearch(true)
    return
  }

  // We should start a search.

  // Add the query to the recent searches
  const recentSearches: string[] = recentGlobalSearches.value.map(x => x)
  const idx = recentSearches.indexOf(query.value)
  if (idx > -1) {
    recentSearches.splice(idx, 1)
  }
  recentSearches.unshift(query.value)
  configStore.setConfigValue('window.recentGlobalSearches', recentSearches.slice(0, 10))

  // Now we're good to go!
  searchProgress.value = 0
  hadNoResult.value = false
  searchIsRunning.value = true
  toggleState.value = false
  emptySearchResults()
  blurQueryInput()
  filter.value = ''

  const restrictDirEntry = directorySuggestions.value.find(s => s.displayValue === restrictToDir.value)
  const restrictToDirectory = restrictDirEntry === undefined
    ? ''
    : restrictDirEntry.absPath

  ipcRenderer.invoke('search-provider', {
    command: 'start-full-text-search',
    payload: {
      query: query.value,
      restrictToDirectory,
      caseInsensitive: caseInsensitive.value
    }
  } satisfies SearchProviderIPCAPI)
    .catch(err => {
      console.error(err)
    })
}

/**
 * Processes a new search result from main
 *
 * @param  {number}                  progress  The current progress in main (0-1)
 * @param  {string}                  absPath   The filepath that had been searched
 * @param  {SearchResult|undefined}  result    The search result, if the file contains a result
 */
async function processSearchResult (progress: number, absPath: string, result: SearchResult|undefined): Promise<void> {
  searchProgress.value = progress

  if (result === undefined) {
    return
  }

  const filename = pathBasename(absPath)
  const root = configStore.config.app.openWorkspaces.find(r => absPath.startsWith(r))
  const relativeDirectoryPath = root !== undefined
    ? relativePath(pathDirname(root), absPath)
    : filename

  const newResult: SearchResultWrapper = {
    key: absPath,
    file: {
      path: absPath, filename,
      relativeDirectoryPath,
      displayName: filename
    },
    result,
    hideResultSet: toggleState.value,
    weight: result.reduce((acc, cur) => acc + cur.weight, 0)
  }
  windowStateStore.addSearchResult(newResult)
}

/**
 * Cancel an in-progress search.
 *
 * @param   {boolean}  startNewSearch  Whether to start a new search afterwards
 */
function cancelSearch (startNewSearch: boolean = false): void {
  ipcRenderer.invoke('search-provider', { command: 'cancel-search', payload: undefined } satisfies SearchProviderIPCAPI)
    .catch(err => console.error(err))

  shouldStartNewSearch.value = startNewSearch
  searchProgress.value = 0
}

/**
 * Empties the current set of search results.
 *
 * @return  {void}    [return description]
 */
function emptySearchResults (): void {
  windowStateStore.searchResults = []
  toggleState.value = false

  // Clear indices of active search result
  activeFileIdx.value = -1
  activeLineIdx.value = -1

  // Also, for convenience, re-focus and select the input if available
  queryInputElement.value?.focus()
  queryInputElement.value?.select()
}

function toggleIndividualResults (): void {
  toggleState.value = !toggleState.value
  for (const result of windowStateStore.searchResults) {
    result.hideResultSet = toggleState.value
  }
}

function fileContextMenu (event: MouseEvent, filePath: string, result: MetadataSearchResult|FileContentSearchResult): void {
  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, getContextMenu(result.type === 'content'), (clickedID: string) => {
    switch (clickedID) {
      case 'new-tab':
        jumpToLine(filePath, result.type === 'content' ? result.line : 1, true)
        break
      case 'copy':
        navigator.clipboard.writeText(result.type === 'content' ? result.excerpt : '').catch(err => console.error(err))
        break
    }
  })
}

function onResultClick (event: MouseEvent, fileIndex: number, lineIndex: number, filePath: string, lineNumber: number): void {
  // This intermediary function is needed to make sure that jumpToLine can
  // also be called from within the context menu (see above).
  if (event.button === 2) {
    return // Do not handle right-clicks
  }

  // Update indices so we can keep track of the most recently clicked
  // search result.
  activeFileIdx.value = fileIndex
  activeLineIdx.value = lineIndex

  const isMiddleClick = (event.type === 'mousedown' && event.button === 1)
  jumpToLine(filePath, lineNumber, isMiddleClick)
}

function jumpToLine (filePath: string, lineNumber: number, openInNewTab: boolean = false): void {
  emit('jtl', filePath, lineNumber, openInNewTab)
}

function markText (resultObject: FileContentSearchResult): string {
  const startTag = '<span class="search-result-highlight">'
  const endTag = '</span>'
  // We receive a result object and should return an HTML string containing
  // highlighting (we're using <strong>) where the result works. We have
  // access to restext, weight, line, and an array of from-to-ranges
  // indicating all matches on the given line. NOTE that all results are
  // being sorted correctly by the main process, so we can just assume the
  // results to be non-overlapping and from beginning to the end of the
  // line.
  let marked = resultObject.excerpt

  // We go through the ranges in reverse order so that the range positions
  // remain valid as we highlight parts of the string
  for (const range of resultObject.ranges.toReversed()) {
    marked = marked.substring(0, range.to) + endTag + marked.substring(range.to)
    marked = marked.substring(0, range.from) + startTag + marked.substring(range.from)
  }

  return sanitizeHTML(marked.replace(/\n/g, '<br />'))
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
  font-size: 13px;

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
    overflow: hidden;
    font-size: 14px;

    div.single-search-result {
      margin-bottom: 5px;
    }

    div.result-header {
      white-space: nowrap;
      display: grid;
      width: 100%;
      grid-template-areas: "relevancy filename collapse" "path path path";
      grid-template-columns: 20px auto 20px;
      grid-template-rows: 1fr 1fr;

      .relevancy-icon { grid-area: relevancy; }

      .filename {
        grid-area: filename;
        font-weight: bold;
      }

      .filename, .filepath {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .collapse-indicator { grid-area: collapse; }

      .filepath {
        color: rgb(131, 131, 131);
        font-size: 10px;
        margin-bottom: 5px;
        grid-area: path;
      }
    }

    div.result-line {
      padding: 5px 0px;
      font-size: 12px;
      display: grid;
      gap: 4px;
      grid-template-areas: "line-number excerpt";
      grid-template-columns: 25px auto;

      .line-number {
        grid-area: line-number;
        text-align: right;
      }

      .excerpt {
        grid-area: excerpt;
      }

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
