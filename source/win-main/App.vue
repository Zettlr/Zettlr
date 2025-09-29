<template>
  <WindowChrome
    v-bind:title="'Zettlr'"
    v-bind:titlebar="shouldShowTitlebar"
    v-bind:menubar="true"
    v-bind:show-toolbar="shouldShowToolbar"
    v-bind:toolbar-labels="false"
    v-bind:toolbar-controls="toolbarControls"
    v-bind:disable-vibrancy="!vibrancyEnabled"
    v-on:toolbar-toggle="handleToggle($event)"
    v-on:toolbar-click="handleClick($event)"
  >
    <SplitView
      ref="fileManagerSplitComponent"
      v-bind:initial-size-percent="fileManagerSplitComponentInitialSize"
      v-bind:minimum-size-percent="[ 10, 50 ]"
      v-bind:reset-size-percent="[ 20, 80 ]"
      v-bind:split="'horizontal'"
      v-on:views-resized="fileManagerSplitComponentResized($event)"
    >
      <template #view1>
        <!-- File manager in the left side of the split view -->
        <FileManager
          v-show="mainSplitViewVisibleComponent === 'fileManager'"
          ref="file-manager"
          v-bind:window-id="windowId"
        ></FileManager>
        <!-- ... or the global search, if selected -->
        <GlobalSearch
          v-show="mainSplitViewVisibleComponent === 'globalSearch'"
          ref="globalSearchComponent"
          v-bind:window-id="windowId"
          v-on:jtl="(filePath, lineNumber, newTab) => jtl(filePath, lineNumber, newTab)"
        >
        </GlobalSearch>
      </template>
      <template #view2>
        <!-- Another split view in the right side -->
        <SplitView
          ref="editorSidebarSplitComponent"
          v-bind:initial-size-percent="editorSidebarSplitComponentInitialSize"
          v-bind:minimum-size-percent="[ 50, 10 ]"
          v-bind:reset-size-percent="[ 80, 20 ]"
          v-bind:split="'horizontal'"
          v-on:views-resized="editorSidebarSplitComponentResized($event)"
        >
          <template #view1>
            <!-- First side: Editor -->
            <EditorPane
              v-if="paneConfiguration?.type === 'leaf'"
              v-bind:node="paneConfiguration"
              v-bind:leaf-id="paneConfiguration.id"
              v-bind:editor-commands="editorCommands"
              v-bind:window-id="windowId"
              v-on:global-search="startGlobalSearch($event)"
            ></EditorPane>
            <EditorBranch
              v-else-if="paneConfiguration !== undefined"
              v-bind:node="paneConfiguration"
              v-bind:window-id="windowId"
              v-bind:editor-commands="editorCommands"
              v-bind:is-last="true"
              v-on:global-search="startGlobalSearch($event)"
            ></EditorBranch>
          </template>
          <template #view2>
            <!-- Second side: Sidebar -->
            <MainSidebar
              v-on:move-section="moveSection($event)"
              v-on:jump-to-line="genericJtl($event)"
            ></MainSidebar>
          </template>
        </SplitView>
      </template>
    </SplitView>
  </WindowChrome>

  <!-- Popover area: these will be teleported to the body element anyhow -->
  <PopoverExport
    v-if="showExportPopover && exportButton !== null && activeFile !== undefined"
    v-bind:target="exportButton"
    v-bind:file-path="activeFile.path"
    v-on:close="showExportPopover = false"
  ></PopoverExport>
  <PopoverStats
    v-if="showStatsPopover && statsButton !== null"
    v-bind:target="statsButton"
    v-on:close="showStatsPopover = false"
  ></PopoverStats>
  <PopoverTags
    v-if="showTagsPopover && tagsButton !== null"
    v-bind:target="tagsButton"
    v-on:close="showTagsPopover = false"
    v-on:search-tag="startGlobalSearch($event)"
  ></PopoverTags>
  <PopoverTable
    v-if="showTablePopover && tableButton !== null"
    v-bind:target="tableButton"
    v-on:close="showTablePopover = false"
    v-on:insert-table="insertTable($event)"
  ></PopoverTable>
  <PopoverDocInfo
    v-if="showDocInfoPopover && docInfoButton !== null && windowStateStore.activeDocumentInfo != null"
    v-bind:target="docInfoButton"
    v-bind:doc-info="windowStateStore.activeDocumentInfo"
    v-bind:should-count-chars="shouldCountChars"
    v-on:close="showDocInfoPopover = false"
  ></PopoverDocInfo>
  <PopoverPomodoro
    v-if="showPomodoroPopover && pomodoroButton !== null"
    v-bind:target="pomodoroButton"
    v-bind:pomodoro="pomodoro"
    v-bind:sound-effects="SOUND_EFFECTS"
    v-on:close="showPomodoroPopover = false"
    v-on:config="setPomodoroConfig($event)"
    v-on:start="startPomodoro()"
    v-on:stop="stopPomodoro()"
  ></PopoverPomodoro>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        App
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the entry component for the main window.
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/WindowChrome.vue'
import FileManager from './file-manager/FileManager.vue'
import MainSidebar from './sidebar/MainSidebar.vue'
import EditorPane from './EditorPane.vue'
import EditorBranch from './EditorBranch.vue'
import SplitView from '../common/vue/window/SplitView.vue'
import GlobalSearch from './GlobalSearch.vue'
import PopoverExport from './PopoverExport.vue'
import PopoverStats from './PopoverStats.vue'
import PopoverTags from './PopoverTags.vue'
import PopoverPomodoro from './PopoverPomodoro.vue'
import PopoverTable from './PopoverTable.vue'
import PopoverDocInfo from './PopoverDocInfo.vue'
import { trans } from '@common/i18n-renderer'
import localiseNumber from '@common/util/localise-number'
import generateId from '@common/util/generate-id'
import {
  nextTick,
  ref,
  computed,
  watch,
  onMounted,
  onBeforeMount
} from 'vue'

// Import the sound effects for the pomodoro timer
import glassFile from './assets/glass.wav'
import alarmFile from './assets/digital_alarm.mp3'
import chimeFile from './assets/chime.mp3'
import { type LeafNodeJSON } from '@dts/common/documents'
import { buildPipeMarkdownTable } from '@common/util/build-pipe-markdown-table'
import { type UpdateState } from '@providers/updates'
import { type ToolbarControl } from '@common/vue/window/WindowToolbar.vue'
import { useConfigStore, useDocumentTreeStore, useWindowStateStore } from 'source/pinia'
import type { ConfigOptions } from 'source/app/service-providers/config/get-config-template'
import { type AnyDescriptor } from 'source/types/common/fsal'
import type { DocumentManagerIPCAPI } from 'source/app/service-providers/documents'

const ipcRenderer = window.ipc

const configStore = useConfigStore()
const documentTreeStore = useDocumentTreeStore()
const windowStateStore = useWindowStateStore()

const SOUND_EFFECTS = [
  {
    file: glassFile,
    label: 'Glass'
  },
  {
    file: alarmFile,
    label: 'Digital Alarm'
  },
  {
    file: chimeFile,
    label: 'Chime'
  }
]

const searchParams = new URLSearchParams(window.location.search)
// The window number indicates which main window this one here is. This is only
// necessary for the documents and split views to show up.
const windowId = searchParams.get('window_id')!

const fileManagerVisible = ref(true)
const mainSplitViewVisibleComponent = ref<'fileManager'|'globalSearch'>('fileManager')
const isUpdateAvailable = ref(false)
const vibrancyEnabled = ref(configStore.config.window.vibrancy)

// Ensure the app remembers the previous sidebar sizes
const fileManagerSplitComponentInitialSize = ref<[number, number]>([ 20, 80 ])
const editorSidebarSplitComponentInitialSize = ref<[number, number]>([ 80, 20 ])
onBeforeMount(() => {
  fileManagerSplitComponentInitialSize.value = configStore.config.ui.fileManagerSplitSize
  editorSidebarSplitComponentInitialSize.value = configStore.config.ui.editorSidebarSplitSize
})

// Popover targets
const exportButton = ref<HTMLElement|null>(null)
const showExportPopover = ref<boolean>(false)
const statsButton = ref<HTMLElement|null>(null)
const showStatsPopover = ref<boolean>(false)
const tagsButton = ref<HTMLElement|null>(null)
const showTagsPopover = ref<boolean>(false)
const tableButton = ref<HTMLElement|null>(null)
const showTablePopover = ref<boolean>(false)
const docInfoButton = ref<HTMLElement|null>(null)
const showDocInfoPopover = ref<boolean>(false)
const pomodoroButton = ref<HTMLElement|null>(null)
const showPomodoroPopover = ref<boolean>(false)

export interface PomodoroConfig {
  currentEffectFile: string
  soundEffect: HTMLAudioElement
  intervalHandle: ReturnType<typeof setInterval>|undefined
  popover: any
  durations: {
    task: number
    short: number
    long: number
  }
  phase: {
    type: 'task'|'short'|'long'
    elapsed: number
  }
  counter: {
    task: number
    short: number
    long: number
  }
  colour: {
    task: string
    short: string
    long: string
  }
}

const pomodoro = ref<PomodoroConfig>({
  currentEffectFile: glassFile,
  soundEffect: new Audio(glassFile),
  intervalHandle: undefined,
  popover: undefined,
  durations: { task: 1500, short: 300, long: 1200 },
  phase: { type: 'task', elapsed: 0 },
  counter: { task: 0, short: 0, long: 0 },
  colour: { task: '#ff3366', short: '#ddff00', long: '#33ffcc' }
})

/**
 * Okay, hear me out. We have the following situation: We have a toolbar, and
 * external components that want to tell the main editor to do something. But
 * Vue doesn't have a concept of events being passed down to child components
 * and since editors may now be nested arbitrarily deep, we have no direct way
 * of accessing the editors and tell them to do something. Basically, Vue's data
 * flow goes like this: Events flow up, and props flow down. That's it. So we're
 * using this hacky solution "misusing" props as events. This interface
 * represents all the potential editor commands that can be issued. The last
 * property can contain arbitrary data if required by the command. We'll be
 * passing this struct as a prop down to every EditorBranch and EditorPane into
 * the main editor components. Every editor instance then listens to these
 * events by watching property changes (i.e. when moveSection switches from true
 * to false) and testing if they are the last editor (the only identifying info
 * we can store in the state to not break things due to Vue's aggressive
 * reactivity). Then, the editors can act based on this info.
 *
 * One example:
 * 1. The app receives a jump to line-command. It then writes the necessary info
 *    (in this case, which line to jump to) into the `data` prop. That is not
 *    watched by the editors, but since it's part of the data structure, it will
 *    silently update in the background.
 * 2. Then, the app switches the jumpToLine-property (false->true or otherwise).
 *    Since that sub-property is being watched by the editors, it will trigger
 *    the watcher that then checks the lastLeafId in the state. If that
 *    corresponds to the editor's leaf ID, the editor calls the appropriate
 *    function locally, and executes the command, providing the data.
 */
export interface EditorCommands {
  jumpToLine: boolean
  moveSection: boolean
  readabilityMode: boolean
  addKeywords: boolean
  replaceSelection: boolean
  executeCommand: boolean
  data: any
}

// Editor commands state
const editorCommands = ref<EditorCommands>({
  jumpToLine: false,
  moveSection: false,
  readabilityMode: false,
  addKeywords: false,
  replaceSelection: false,
  executeCommand: false,
  data: undefined
})

const sidebarsBeforeDistractionfree = ref<{ fileManager: boolean, sidebar: boolean }>({
  fileManager: true,
  sidebar: false
})

const sidebarVisible = computed<boolean>(() => configStore.config.window.sidebarVisible)
const activeFile = computed(() => documentTreeStore.lastLeafActiveFile)
const shouldCountChars = computed<boolean>(() => configStore.config.editor.countChars)
const shouldShowToolbar = computed<boolean>(() => !distractionFree.value || !configStore.config.display.hideToolbarInDistractionFree)
// We need to display the titlebar in case the user decides to hide the toolbar.
// The titlebar is much less distracting, but this way the user can at least
// drag the window around.
const shouldShowTitlebar = computed<boolean>(() => !shouldShowToolbar.value)
const parsedDocumentInfo = computed<string>(() => {
  const info = windowStateStore.activeDocumentInfo
  if (info == null) {
    return ''
  }

  let cnt = ''

  if (info.selections.length > 0) {
    // We have selections to display.
    let length = 0
    info.selections.forEach((sel: any) => {
      length += shouldCountChars.value ? sel.chars : sel.words
    })

    cnt = trans('%s selected', localiseNumber(length))
    cnt += '<br>'
    if (info.selections.length === 1) {
      cnt += (info.selections[0].anchor.line) + ':'
      cnt += (info.selections[0].anchor.ch) + ' &ndash; '
      cnt += (info.selections[0].head.line) + ':'
      cnt += (info.selections[0].head.ch)
    } else {
      // Multiple selections --> indicate
      cnt += trans('%s selections', info.selections.length)
    }
  } else {
    // No selection.
    cnt = shouldCountChars.value
      ? trans('%s characters', localiseNumber(info.chars))
      : trans('%s words', localiseNumber(info.words))
    cnt += '<br>'
    cnt += info.cursor.line + ':' + info.cursor.ch
  }

  return cnt
})

const toolbarControls = computed<ToolbarControl[]>(() => {
  return [
    {
      type: 'three-way-toggle',
      id: 'toggle-file-manager',
      stateOne: {
        id: 'fileManager',
        title: trans('Toggle File Manager'),
        icon: 'hard-disk'
      },
      stateTwo: {
        id: 'globalSearch',
        title: trans('Search across all files'),
        icon: 'search'
      },
      initialState: (fileManagerVisible.value) ? mainSplitViewVisibleComponent.value : undefined
    },
    {
      type: 'button',
      id: 'root-open-workspaces',
      title: trans('Open workspace…'),
      icon: 'folder-open'
    },
    {
      type: 'button',
      id: 'show-stats',
      title: trans('View writing statistics'),
      icon: 'line-chart'
    },
    {
      type: 'button',
      id: 'show-tag-cloud',
      title: trans('View Tag Cloud'),
      icon: 'tag',
      badge: undefined // this.hasTagSuggestions
    },
    {
      type: 'button',
      id: 'open-preferences',
      title: trans('Open settings'),
      icon: 'cog',
      visible: getToolbarButtonDisplay('showOpenPreferencesButton')
    },
    {
      type: 'button',
      id: 'new-file',
      title: trans('New file…'),
      icon: 'plus',
      visible: getToolbarButtonDisplay('showNewFileButton')
    },
    {
      type: 'button',
      id: 'previous-file',
      title: trans('Previous file'),
      icon: 'arrow',
      direction: 'left',
      visible: getToolbarButtonDisplay('showPreviousFileButton')
    },
    {
      type: 'button',
      id: 'next-file',
      title: trans('Next file'),
      icon: 'arrow',
      direction: 'right',
      visible: getToolbarButtonDisplay('showNextFileButton')
    },
    {
      type: 'spacer',
      size: '3x'
    },
    {
      type: 'button',
      class: 'share',
      id: 'export',
      title: trans('Export current file'),
      icon: 'export'
    },
    {
      type: 'button',
      id: 'toggle-readability',
      title: trans('Toggle readability mode'),
      icon: 'eye',
      visible: getToolbarButtonDisplay('showToggleReadabilityButton')
    },
    {
      type: 'spacer',
      id: 'spacer-two',
      size: '1x'
    },
    {
      type: 'button',
      id: 'markdownComment',
      title: trans('Insert comment'),
      icon: 'code',
      visible: getToolbarButtonDisplay('showMarkdownCommentButton')
    },
    {
      type: 'button',
      id: 'markdownLink',
      title: trans('Insert link'),
      icon: 'link',
      visible: getToolbarButtonDisplay('showMarkdownLinkButton')
    },
    {
      type: 'button',
      id: 'markdownImage',
      title: trans('Insert image'),
      icon: 'image',
      visible: getToolbarButtonDisplay('showMarkdownImageButton')
    },
    {
      type: 'button',
      id: 'markdownMakeTaskList',
      title: trans('Insert task list'),
      icon: 'checkbox-list',
      visible: getToolbarButtonDisplay('showMarkdownMakeTaskListButton')
    },
    {
      type: 'button',
      id: 'insert-table',
      title: trans('Insert table'),
      icon: 'table',
      visible: getToolbarButtonDisplay('showInsertTableButton')
    },
    {
      type: 'button',
      id: 'insertFootnote',
      title: trans('Insert footnote'),
      icon: 'footnote',
      visible: getToolbarButtonDisplay('showInsertFootnoteButton')
    },
    {
      type: 'spacer',
      size: '3x'
    },
    {
      type: 'text',
      align: 'center',
      id: 'document-info',
      content: parsedDocumentInfo.value,
      visible: getToolbarButtonDisplay('showDocumentInfoText')
    },
    {
      type: 'ring',
      id: 'pomodoro',
      title: trans('Pomodoro timer'),
      // Good morning, we are verbose here
      progressPercent: pomodoro.value.phase.elapsed / pomodoro.value.durations[pomodoro.value.phase.type] * 100,
      colour: pomodoro.value.colour[pomodoro.value.phase.type],
      visible: getToolbarButtonDisplay('showPomodoroButton')
    },
    {
      type: 'toggle',
      id: 'toggle-sidebar',
      title: trans('Toggle Sidebar'),
      icon: 'view-columns',
      initialState: sidebarVisible.value
    },
    {
      type: 'button',
      id: 'open-updater',
      title: trans('Update available'),
      showLabel: true,
      buttonText: trans('Update available'),
      icon: 'download',
      visible: isUpdateAvailable.value
    }
  ]
})

const editorSidebarSplitComponent = ref<typeof SplitView|null>(null)
const fileManagerSplitComponent = ref<typeof SplitView|null>(null)
const globalSearchComponent = ref<typeof GlobalSearch|null>(null)
const paneConfiguration = computed(() => documentTreeStore.paneStructure)
const lastLeafId = computed(() => documentTreeStore.lastLeafId)
const distractionFree = computed<boolean>(() => windowStateStore.distractionFreeMode !== undefined)

watch(sidebarVisible, (newValue) => {
  if (newValue) {
    if (distractionFree.value) {
      if (windowStateStore.distractionFreeMode !== undefined) {
        windowStateStore.distractionFreeMode = undefined
      }
    }

    editorSidebarSplitComponent.value?.unhide()
  } else {
    editorSidebarSplitComponent.value?.hideView(2)
  }
})

watch(fileManagerVisible, (newValue) => {
  if (newValue) {
    if (distractionFree.value) {
      if (windowStateStore.distractionFreeMode !== undefined) {
        windowStateStore.distractionFreeMode = undefined
      }
    }

    fileManagerSplitComponent.value?.unhide()
  } else {
    fileManagerSplitComponent.value?.hideView(1)
  }
})

watch(mainSplitViewVisibleComponent, (newValue) => {
  if (newValue === 'globalSearch') {
    // The global search just became visible, so focus the query input
    nextTick().then(() => {
      globalSearchComponent.value?.focusQueryInput()
    }).catch(e => console.error(e))
  }
})

watch(distractionFree, (newValue) => {
  if (newValue) {
    // Enter distraction free mode
    sidebarsBeforeDistractionfree.value = {
      fileManager: fileManagerVisible.value,
      sidebar: sidebarVisible.value
    }
    configStore.setConfigValue('window.sidebarVisible', false)
    fileManagerVisible.value = false
  } else {
    // Leave distraction free mode
    configStore.setConfigValue('window.sidebarVisible', sidebarsBeforeDistractionfree.value.sidebar)
    fileManagerVisible.value = sidebarsBeforeDistractionfree.value.fileManager
  }
})

onMounted(() => {
  exportButton.value = document.querySelector('#toolbar-export')
  statsButton.value = document.querySelector('#toolbar-show-stats')
  tagsButton.value = document.querySelector('#toolbar-show-tag-cloud')
  tableButton.value = document.querySelector('#toolbar-insert-table')
  docInfoButton.value = document.querySelector('#toolbar-document-info')
  pomodoroButton.value = document.querySelector('#toolbar-pomodoro')

  ipcRenderer.on('shortcut', (event, shortcut) => {
    if (shortcut === 'toggle-sidebar') {
      configStore.setConfigValue('window.sidebarVisible', !sidebarVisible.value)
    } else if (shortcut === 'insert-id') {
      editorCommands.value.data = generateId(configStore.config.zkn.idGen)
      editorCommands.value.replaceSelection = !editorCommands.value.replaceSelection
    } else if (shortcut === 'copy-current-id' && documentTreeStore.lastLeafActiveFile !== undefined) {
      ipcRenderer.invoke('application', {
        command: 'get-descriptor',
        payload: documentTreeStore.lastLeafActiveFile.path
      })
        .then((descriptor: AnyDescriptor|undefined) => {
          if (descriptor?.type === 'file' && descriptor?.id !== '') {
            navigator.clipboard.writeText(descriptor.id).catch(err => console.error(err))
          }
        })
        .catch(err => console.error(err))
    } else if (shortcut === 'global-search') {
      fileManagerVisible.value = true
      mainSplitViewVisibleComponent.value = 'globalSearch'
      // Focus input
      nextTick()
        .then(() => { globalSearchComponent.value?.focusQueryInput() })
        .catch(err => console.error(err))
    } else if (shortcut === 'toggle-file-manager') {
      if (fileManagerVisible.value && mainSplitViewVisibleComponent.value === 'fileManager') {
        fileManagerVisible.value = false
      } else if (!fileManagerVisible.value) {
        fileManagerVisible.value = true
        mainSplitViewVisibleComponent.value = 'fileManager'
      } else if (mainSplitViewVisibleComponent.value === 'globalSearch') {
        mainSplitViewVisibleComponent.value = 'fileManager'
      }
    } else if (shortcut === 'filter-files') {
      // We need to immediately make the file manager visible, which will
      // -- in the next tick -- focus its filter input.
      fileManagerVisible.value = true
      mainSplitViewVisibleComponent.value = 'fileManager'
    } else if (shortcut === 'export') {
      showExportPopover.value = true
    } else if (shortcut === 'print') {
      if (activeFile.value !== undefined) {
        ipcRenderer.invoke('application', { command: 'print', payload: activeFile.value.path })
          .catch(err => console.error(err))
      }
    } else if (shortcut === 'navigate-back') {
      ipcRenderer.invoke('documents-provider', {
        command: 'navigate-back',
        payload: {
          windowId,
          leafId: lastLeafId.value
        }
      } as DocumentManagerIPCAPI).catch(err => console.error(err))
    } else if (shortcut === 'navigate-forward') {
      ipcRenderer.invoke('documents-provider', {
        command: 'navigate-forward',
        payload: {
          windowId,
          leafId: lastLeafId.value
        }
      } as DocumentManagerIPCAPI).catch(err => console.error(err))
    }
  })

  // Initially, we need to hide the sidebar, since the view will be visible
  // by default.
  if (!sidebarVisible.value) {
    editorSidebarSplitComponent.value?.hideView(2)
  }

  // Check if there is an update available.
  ipcRenderer.invoke('update-provider', { command: 'update-status' })
    .then((state: UpdateState) => {
      isUpdateAvailable.value = state.updateAvailable
    })
    .catch(err => console.error(err))

  // Also, listen for any changes in the update available state
  ipcRenderer.on('update-provider', (event, command: string, updateState: UpdateState) => {
    if (command === 'state-changed') {
      isUpdateAvailable.value = updateState.updateAvailable
    }
  })
})

function fileManagerSplitComponentResized (sizes: [number, number]): void {
  configStore.setConfigValue('ui.fileManagerSplitSize', sizes)
}

function editorSidebarSplitComponentResized (sizes: [number, number]): void {
  configStore.setConfigValue('ui.editorSidebarSplitSize', sizes)
}

function insertTable (spec: { rows: number, cols: number }): void {
  // Generate a simple table based on the info, and insert it.
  const align: Array<'center'|'left'|'right'|null> = Array(spec.cols).fill(null)
  const row = (): string[] => Array(spec.cols).fill('')
  const ast: string[][] = Array.from({ length: spec.rows }, row)

  editorCommands.value.data = buildPipeMarkdownTable(ast, align)
  editorCommands.value.replaceSelection = !editorCommands.value.replaceSelection
}

function genericJtl (lineNumber: number): void {
  // This function is called from the sidebar where we already know the file
  // is open (because its editor component has provided the table of
  // contents in the first place).
  const doc = documentTreeStore.lastLeafActiveFile
  if (doc !== undefined) {
    editorCommands.value.data = { filePath: doc.path, lineNumber }
    editorCommands.value.jumpToLine = !editorCommands.value.jumpToLine
  }
}

function jtl (filePath: string, lineNumber: number, newTab: boolean): void {
  // We need to make sure the given file is (a) open somewhere and (b) the
  // active file.

  // Simplest case: The file is already active somewhere
  const activeFileLeaf = documentTreeStore.paneData
    .find((pane: LeafNodeJSON) => pane.activeFile?.path === filePath)
  if (activeFileLeaf !== undefined) {
    // There is at least one leaf with the given file being active, so we
    // can simply emit the event
    editorCommands.value.data = { filePath, lineNumber }
    editorCommands.value.jumpToLine = !editorCommands.value.jumpToLine
    return
  }

  const WAIT_TIME = 100 // How long to wait before re-executing the jtl()

  // Next, let's see if the file is at least open somewhere
  const containingLeaf = documentTreeStore.paneData
    .find((pane: LeafNodeJSON) => {
      return pane.openFiles.find(doc => doc.path === filePath) !== undefined
    })
  if (containingLeaf !== undefined) {
    // Let's first make it the active file and then execute the command
    ipcRenderer.invoke('documents-provider', {
      command: 'open-file',
      payload: { path: filePath, windowId, leafId: containingLeaf.id }
    } as DocumentManagerIPCAPI)
      .then(() => {
        // Re-execute the jtl command
        setTimeout(() => jtl(filePath, lineNumber, newTab), WAIT_TIME)
      })
      .catch(e => console.error(e))
    return
  }

  // If we're here, the file was not open, so we have to do that first. At
  // least this both makes it an open file AND an active file somewhere in
  // the window.
  ipcRenderer.invoke('documents-provider', {
    command: 'open-file',
    payload: {
      path: filePath,
      windowId,
      leafId: lastLeafId.value,
      newTab
    }
  } as DocumentManagerIPCAPI)
    .then(() => {
      // Re-execute the jtl command
      setTimeout(() => jtl(filePath, lineNumber, newTab), WAIT_TIME)
    })
    .catch(e => console.error(e))
}

function moveSection (data: { from: number, to: number }): void {
  editorCommands.value.data = { from: data.from, to: data.to }
  editorCommands.value.moveSection = !editorCommands.value.moveSection
}

function startGlobalSearch (terms: string): void {
  mainSplitViewVisibleComponent.value = 'globalSearch'
  fileManagerVisible.value = true
  nextTick()
    .then(() => {
      globalSearchComponent.value?.startSearch(terms)
    })
    .catch(err => console.error(err))
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function toggleFileList (): void {
  // This event can be used by various components to ask the file manager to
  // toggle its file list visibility
  fileManagerSplitComponent.value?.toggleFileList()
}

function handleClick (clickedID?: string): void {
  if (clickedID === 'toggle-readability') {
    editorCommands.value.readabilityMode = !editorCommands.value.readabilityMode
  } else if (clickedID === 'root-open-workspaces') {
    ipcRenderer.invoke('application', { command: 'root-open-workspaces' })
      .catch(e => console.error(e))
  } else if (clickedID === 'open-preferences') {
    ipcRenderer.invoke('application', { command: 'open-preferences' })
      .catch(e => console.error(e))
  } else if (clickedID === 'new-file') {
    ipcRenderer.invoke('application', { command: 'file-new', payload: { type: 'md' } })
      .catch(e => console.error(e))
  } else if (clickedID === 'previous-file') {
    ipcRenderer.invoke('documents-provider', {
      command: 'navigate-back',
      payload: {
        windowId,
        leafId: lastLeafId.value
      }
    } as DocumentManagerIPCAPI).catch(err => console.error(err))
  } else if (clickedID === 'next-file') {
    ipcRenderer.invoke('documents-provider', {
      command: 'navigate-forward',
      payload: {
        windowId,
        leafId: lastLeafId.value
      }
    } as DocumentManagerIPCAPI).catch(err => console.error(err))
  } else if (clickedID === 'export') {
    showExportPopover.value = !showExportPopover.value
  } else if (clickedID === 'show-stats') {
    // The user wants to display the stats
    showStatsPopover.value = !showStatsPopover.value
  } else if (clickedID === 'show-tag-cloud') {
    showTagsPopover.value = !showTagsPopover.value
    // TODO startGlobalSearch('#' + data.searchForTag)
    // editorCommands.value.data = data.suggestions
    // editorCommands.value.addKeywords = !editorCommands.value.addKeywords
  } else if (clickedID === 'pomodoro') {
    showPomodoroPopover.value = !showPomodoroPopover.value
  } else if (clickedID === 'insert-table') {
    // Display the insertion popover
    showTablePopover.value = !showTablePopover.value
  } else if (clickedID === 'document-info') {
    showDocInfoPopover.value = !showDocInfoPopover.value
  } else if (clickedID !== undefined && clickedID.startsWith('markdown') && clickedID.length > 8) {
    // The user clicked a command button, so we just have to run that.
    editorCommands.value.data = clickedID
    editorCommands.value.executeCommand = !editorCommands.value.executeCommand
  } else if (clickedID === 'insertFootnote') {
    editorCommands.value.data = clickedID
    editorCommands.value.executeCommand = !editorCommands.value.executeCommand
  } else if (clickedID === 'open-updater') {
    ipcRenderer.invoke('application', {
      command: 'open-update-window'
    })
      .catch(err => console.error(err))
  }
}

function setPomodoroConfig (config: PomodoroConfig): void {
  // Update the durations as necessary
  pomodoro.value.durations.task = config.durations.task
  pomodoro.value.durations.short = config.durations.short
  pomodoro.value.durations.long = config.durations.long

  const effectChanged = config.currentEffectFile !== pomodoro.value.currentEffectFile
  const volumeChanged = config.soundEffect.volume !== pomodoro.value.soundEffect.volume
  if (effectChanged) {
    pomodoro.value.currentEffectFile = config.currentEffectFile
    pomodoro.value.soundEffect = new Audio(config.currentEffectFile)
    pomodoro.value.soundEffect.volume = config.soundEffect.volume
  }
  if (!effectChanged && volumeChanged) {
    pomodoro.value.soundEffect.volume = config.soundEffect.volume
  }

  if (effectChanged || volumeChanged) {
    pomodoro.value.soundEffect.pause()
    pomodoro.value.soundEffect.currentTime = 0
    pomodoro.value.soundEffect.play().catch(_e => {
      /* We will be getting errors when pausing quickly */
    })
  }
}

function handleToggle (controlState: { id?: string, state?: string | boolean }): void {
  const { id, state } = controlState
  if (id === 'toggle-sidebar') {
    configStore.setConfigValue('window.sidebarVisible', state)
  } else if (id === 'toggle-file-manager') {
    // Since this is a three-way-toggle, we have to inspect the state.
    fileManagerVisible.value = state !== undefined
    if (typeof state === 'string' && (state === 'fileManager' || state === 'globalSearch')) {
      // Set the shown component to the correct one
      mainSplitViewVisibleComponent.value = state
    } else {
      console.warn(`Could not toggle main split component; expected state to be 'fileManager' or 'globalSearch', received ${state}`)
    }
  }
}

function startPomodoro (): void {
  pomodoro.value.soundEffect.pause()
  pomodoro.value.soundEffect.currentTime = 0
  // Starts a new pomodoro timer
  pomodoro.value.phase.type = 'task'
  pomodoro.value.phase.elapsed = 0

  pomodoro.value.intervalHandle = setInterval(() => {
    pomodoroTick()
  }, 1000)
}

function pomodoroTick (): void {
  // Progresses the pomodoro counter by one second
  pomodoro.value.phase.elapsed += 1

  const currentPhaseDur = pomodoro.value.durations[pomodoro.value.phase.type]
  const phaseIsFinished = pomodoro.value.phase.elapsed === currentPhaseDur

  if (phaseIsFinished) {
    pomodoro.value.phase.elapsed = 0
    pomodoro.value.counter[pomodoro.value.phase.type] += 1

    if (pomodoro.value.phase.type === 'task' && pomodoro.value.counter.task % 4 === 0) {
      pomodoro.value.phase.type = 'long'
    } else if (pomodoro.value.phase.type === 'task') {
      pomodoro.value.phase.type = 'short'
    } else {
      // Both breaks lead to a new task
      pomodoro.value.phase.type = 'task'
    }

    pomodoro.value.soundEffect.play().catch(_e => { /* We will be getting errors when pausing quickly */ })
  }

  // Finally handle the popover logic
  if (pomodoro.value.popover !== undefined && pomodoro.value.popover.isClosed() === false) {
    // The popover is visible, so let's update the data. Good thing is, we
    // only really need to update two things: The current task, and the
    // elapsed time.
    pomodoro.value.popover.updateData({
      internalCurrentPhase: pomodoro.value.phase.type,
      internalElapsed: pomodoro.value.phase.elapsed
    })
  } else if (pomodoro.value.popover !== undefined && pomodoro.value.popover.isClosed() === true) {
    pomodoro.value.popover = undefined // Cleanup
  }
}

function stopPomodoro (): void {
  pomodoro.value.soundEffect.pause()
  pomodoro.value.soundEffect.currentTime = 0
  // Stops the pomodoro timer
  pomodoro.value.phase.type = 'task'
  pomodoro.value.phase.elapsed = 0
  pomodoro.value.counter.task = 0
  pomodoro.value.counter.short = 0
  pomodoro.value.counter.long = 0

  if (pomodoro.value.intervalHandle !== undefined) {
    clearInterval(pomodoro.value.intervalHandle)
    pomodoro.value.intervalHandle = undefined
  }
}

function getToolbarButtonDisplay (configName: keyof ConfigOptions['displayToolbarButtons']): boolean {
  return configStore.config.displayToolbarButtons[configName]
}
</script>

<style lang="less">
//
</style>
