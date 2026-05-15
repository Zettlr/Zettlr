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
    <CheckboxControl
      v-model="caseInsensitive"
      v-bind:label="caseInsensitiveLabel"
    ></CheckboxControl>
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
      <p v-if="!searchIsRunning && searchResults.length > 0" style="text-align: center;">
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
      <p style="font-size: 14px; padding: 5px 0; text-align: center;">
        {{ resultsMessage }}
      </p>
      <hr>
    </template>
    <!--
      During searching, display a progress bar that indicates how far we are and
      that allows to interrupt the search, if it takes too long.
    -->
    <template v-if="searchIsRunning || true">
      <div>
        <ProgressControl
          v-bind:max="sumFilesToSearch"
          v-bind:value="searchResults.length"
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
          {{ result.file.relativeDirectoryPath }}
        </div>
        <div v-if="!result.hideResultSet" class="results-container">
          <template
            v-for="singleRes, idx2 in result.result"
            v-bind:key="idx2"
          >
            <div
              v-if="singleRes.type === 'content'"
              class="result-line"
              v-bind:class="{ active: idx === activeFileIdx && idx2 === activeLineIdx }"
              v-on:contextmenu.stop.prevent="fileContextMenu($event, result.file.path, singleRes.line, singleRes.excerpt)"
              v-on:mousedown.stop.prevent="onResultClick($event, idx, idx2, result.file.path, singleRes.line)"
            >
              <span v-if="singleRes.line !== -1"><strong>{{ singleRes.line + 1 }}</strong>: </span>
              <!-- eslint-disable-next-line vue/no-v-html NOTE: We can disable the v-html error here, since markText runs DOMPurify over the data, and we have to allow HTML tags to mark the elements. -->
              <span v-html="markText(singleRes)"></span>
            </div>
            <div
              v-else
              class="result-line"
              v-bind:class="{ active: idx === activeFileIdx && idx2 === activeLineIdx }"
              v-on:contextmenu.stop.prevent="fileContextMenu($event, result.file.path, 1)"
              v-on:mousedown.stop.prevent="onResultClick($event, idx, idx2, result.file.path, 1)"
            >
              <span><strong>Metadata</strong>: </span>
            </div>
          </template>
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

import TextControl from '@common/vue/form/elements/TextControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import ProgressControl from '@common/vue/form/elements/ProgressControl.vue'
import AutocompleteText from '@common/vue/form/elements/AutocompleteText.vue'
import { trans } from '@common/i18n-renderer'
import { ref, computed, onMounted } from 'vue'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { useConfigStore, useWindowStateStore, useWorkspaceStore } from 'source/pinia'
import { pathBasename, pathDirname, relativePath } from 'source/common/util/renderer-path-polyfill'
import { sanitizeHTML } from 'source/common/util/sanitize-html'
import type { SearchProviderIPCAPI, SearchResult, FileContentSearchResult } from 'source/app/service-providers/search'
import CheckboxControl from 'source/common/vue/form/elements/CheckboxControl.vue'

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
// The number of files the search started with (for progress bar)
const sumFilesToSearch = ref<number>(0)
// A global trigger for the result set trigger. This will determine what
// the toggle will do to all result sets -- either hide or display them.
const toggleState = ref<boolean>(true)
// Contains the current search's maximum (combined) weight across the results
const maxWeight = ref<number>(0)
// The file list index of the most recently clicked search result.
const activeFileIdx = ref<undefined|number>(undefined)
// The result line index of the most recently clicked search result.
const activeLineIdx = ref<undefined|number>(undefined)

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
const directorySuggestions = computed<string[]>(() => {
  const suggestedDirectories: string[] = []
  for (const [ rootPath, dirPaths ] of workspaceStore.workspaceMap.entries()) {
    const rootDir = pathDirname(rootPath)
    const wsRelativePaths = dirPaths
      // Map paths to descriptors
      .map(p => workspaceStore.descriptorMap.get(p))
      // Only retain directories
      .filter(d => d !== undefined && d.type === 'directory')
      // Map from absolute to workspace-relative paths
      .map(d => d.path.slice(rootDir.length + 1))
      // Filter empty ones
      .filter(p => p.length > 0)
    
    suggestedDirectories.push(...wsRelativePaths)
  }
  return suggestedDirectories
})

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
  const nFiles = searchResults.value.filter(r => r.result.length > 0).length
  return trans('%s matches across %s files', nMatches, nFiles)
})

/**
 * Allows search results to be further filtered
 */
const filteredSearchResults = computed<SearchResultWrapper[]>(() => {
  const matchedResults = searchResults.value.filter(r => r.result.length > 0)
  if (filter.value === '') {
    return matchedResults
  }

  const lowercase = filter.value.toLowerCase()

  return matchedResults
    .filter(result => {
      for (const r of result.result) {
        if (r.type === 'content' && r.excerpt.toLowerCase().includes(lowercase)) {
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

const searchIsRunning = ref<boolean>(false)
const shouldStartNewSearch = ref<boolean>(false)

onMounted(() => {
  queryInputElement.value?.focus()

  ipcRenderer.on('search-provider', (event, message) => {
    if (message.type === 'search-end') {
      searchIsRunning.value = false
    } else if (message.type === 'search-result') {
      processSearchResult(message.file as string, message.result as SearchResult)
        .catch(err => console.error(err))
    }
  })
})

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
  searchIsRunning.value = true
  maxWeight.value = 0
  toggleState.value = true
  emptySearchResults()
  blurQueryInput()
  filter.value = ''
  ipcRenderer.invoke('search-provider', {
    command: 'start-full-text-search',
    payload: {
      query: query.value,
      restrictToDirectory: restrictToDir.value,
      caseInsensitive: caseInsensitive.value
    }
  } satisfies SearchProviderIPCAPI)
    .then((numberOfFiles: number) => {
      console.log(numberOfFiles)
      sumFilesToSearch.value = numberOfFiles
    })
    .catch(err => {
      console.error(err)
    })
}

async function processSearchResult (absPath: string, result: SearchResult): Promise<void> {
  // TODO: Find root for absPath
  const root = ''
  const newResult: SearchResultWrapper = {
    file: {
      filename: pathBasename(absPath),
      relativeDirectoryPath: relativePath(pathDirname(root), absPath),
      displayName: pathBasename(absPath), // TODO
      path: absPath
    },
    result,
    hideResultSet: true, // If true, the individual results won't be displayed
    weight: result.reduce((acc, cur) => acc + cur.weight, 0)
  }

  windowStateStore.searchResults.push(newResult)

  if (newResult.weight > maxWeight.value) {
    maxWeight.value = newResult.weight
  }

  // finaliseSearch()
}

function cancelSearch (startNewSearch: boolean = false): void {
  ipcRenderer.invoke('search-provider', { command: 'cancel-search', payload: undefined } satisfies SearchProviderIPCAPI)
    .catch(err => console.error(err))

  shouldStartNewSearch.value = startNewSearch
}

function emptySearchResults (): void {
  windowStateStore.searchResults = []
  maxWeight.value = 0
  toggleState.value = true

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

function fileContextMenu (event: MouseEvent, filePath: string, lineNumber: number, restext?: string): void {
  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, getContextMenu(restext !== undefined), (clickedID: string) => {
    switch (clickedID) {
      case 'new-tab':
        jumpToLine(filePath, lineNumber, true)
        break
      case 'copy':
        navigator.clipboard.writeText(restext ?? '').catch(err => console.error(err))
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
