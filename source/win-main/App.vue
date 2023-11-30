<template>
  <WindowChrome
    v-bind:title="title"
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
      ref="file-manager-split"
      v-bind:initial-size-percent="[ 20, 80 ]"
      v-bind:minimum-size-percent="[ 10, 50 ]"
      v-bind:split="'horizontal'"
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
          ref="global-search"
          v-bind:window-id="windowId"
          v-on:jtl="(filePath, lineNumber, newTab) => jtl(filePath, lineNumber, newTab)"
        >
        </GlobalSearch>
      </template>
      <template #view2>
        <!-- Another split view in the right side -->
        <SplitView
          ref="editor-sidebar-split"
          v-bind:initial-size-percent="[ 80, 20 ]"
          v-bind:minimum-size-percent="[ 50, 10 ]"
          v-bind:split="'horizontal'"
        >
          <template #view1>
            <!-- First side: Editor -->
            <EditorPane
              v-if="paneConfiguration.type === 'leaf'"
              v-bind:node="paneConfiguration"
              v-bind:leaf-id="paneConfiguration.id"
              v-bind:editor-commands="editorCommands"
              v-bind:window-id="windowId"
              v-on:global-search="startGlobalSearch($event)"
            ></EditorPane>
            <EditorBranch
              v-else
              v-bind:node="paneConfiguration"
              v-bind:window-id="windowId"
              v-bind:editor-commands="editorCommands"
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
</template>

<script lang="ts">
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

import WindowChrome from '@common/vue/window/Chrome.vue'
import FileManager from './file-manager/file-manager.vue'
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
import { nextTick, defineComponent } from 'vue'

// Import the sound effects for the pomodoro timer
import glassFile from './assets/glass.wav'
import alarmFile from './assets/digital_alarm.mp3'
import chimeFile from './assets/chime.mp3'
import { ToolbarControl } from '@dts/renderer/window'
import { OpenDocument, BranchNodeJSON, LeafNodeJSON } from '@dts/common/documents'
import { EditorCommands } from '@dts/renderer/editor'
import buildPipeTable from '@common/modules/markdown-editor/table-editor/build-pipe'
import { UpdateState } from '@providers/updates'

const ipcRenderer = window.ipc
const clipboard = window.clipboard

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

export default defineComponent({
  components: {
    WindowChrome,
    FileManager,
    EditorPane,
    EditorBranch,
    SplitView,
    GlobalSearch,
    MainSidebar
  },
  data: function () {
    const searchParams = new URLSearchParams(window.location.search)
    return {
      title: 'Zettlr',
      // The window number indicates which main window this one here is. This is
      // only necessary for the documents and split views to show up.
      windowId: searchParams.get('window_id') as string,
      fileManagerVisible: true,
      mainSplitViewVisibleComponent: 'fileManager',
      isUpdateAvailable: false,
      vibrancyEnabled: window.config.get('window.vibrancy') as boolean,
      // Pomodoro state
      pomodoro: {
        currentEffectFile: glassFile,
        soundEffect: new Audio(glassFile),
        intervalHandle: undefined as undefined|ReturnType<typeof setInterval>,
        popover: undefined as any,
        durations: {
          task: 1500,
          short: 300,
          long: 1200
        },
        phase: {
          type: 'task' as 'task'|'short'|'long',
          elapsed: 0
        },
        counter: {
          task: 0,
          short: 0,
          long: 0
        },
        colour: {
          task: '#ff3366',
          short: '#ddff00',
          long: '#33ffcc'
        }
      },
      // Editor commands state
      editorCommands: {
        jumpToLine: false,
        moveSection: false,
        readabilityMode: false,
        addKeywords: false,
        replaceSelection: false,
        executeCommand: false,
        data: undefined
      } as EditorCommands,
      sidebarsBeforeDistractionfree: {
        fileManager: true,
        sidebar: false
      }
    }
  },
  computed: {
    sidebarVisible: function (): boolean {
      return this.$store.state.config['window.sidebarVisible'] as boolean
    },
    activeFile: function (): OpenDocument|null {
      return this.$store.getters.lastLeafActiveFile()
    },
    modifiedFiles: function (): string[] {
      return Array.from(this.$store.state.modifiedFiles.keys())
    },
    shouldCountChars: function (): boolean {
      return this.$store.state.config['editor.countChars']
    },
    shouldShowToolbar: function (): boolean {
      return this.distractionFree === false || this.$store.state.config['display.hideToolbarInDistractionFree'] === false
    },
    shouldShowTitlebar: function (): boolean {
      // We need to display the titlebar in case the user decides to hide the
      // toolbar. The titlebar is much less distracting, but this way the user
      // can at least drag the window around.
      return this.shouldShowToolbar === false
    },
    parsedDocumentInfo: function (): any {
      const info = this.$store.state.activeDocumentInfo
      if (info === null) {
        return ''
      }

      let cnt = ''

      if (info.selections.length > 0) {
        // We have selections to display.
        let length = 0
        info.selections.forEach((sel: any) => {
          length += this.shouldCountChars ? sel.chars : sel.words
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
        cnt = this.shouldCountChars
          ? trans('%s characters', localiseNumber(info.chars))
          : trans('%s words', localiseNumber(info.words))
        cnt += '<br>'
        cnt += info.cursor.line + ':' + info.cursor.ch
      }

      return cnt
    },
    toolbarControls: function (): ToolbarControl[] {
      return [
        {
          type: 'three-way-toggle',
          id: 'toggle-file-manager',
          stateOne: {
            id: 'fileManager',
            title: trans('File manager'),
            icon: 'hard-disk'
          },
          stateTwo: {
            id: 'globalSearch',
            title: trans('Global search'),
            icon: 'search'
          },
          initialState: (this.fileManagerVisible === true) ? this.mainSplitViewVisibleComponent : undefined
        },
        {
          type: 'button',
          id: 'root-open-workspaces',
          title: trans('Open Workspace …'),
          icon: 'folder-open'
        },
        {
          type: 'button',
          id: 'show-stats',
          title: trans('View stats'),
          icon: 'line-chart'
        },
        {
          type: 'button',
          id: 'show-tag-cloud',
          title: trans('Tags'),
          icon: 'tag',
          badge: undefined // this.hasTagSuggestions
        },
        {
          type: 'button',
          id: 'open-preferences',
          title: trans('Open the settings dialog'),
          icon: 'cog',
          visible: this.getToolbarButtonDisplay('showOpenPreferencesButton')
        },
        {
          type: 'button',
          id: 'new-file',
          title: trans('New File…'),
          icon: 'plus',
          visible: this.getToolbarButtonDisplay('showNewFileButton')
        },
        {
          type: 'button',
          id: 'previous-file',
          title: trans('Previous file'),
          icon: 'arrow',
          direction: 'left',
          visible: this.getToolbarButtonDisplay('showPreviousFileButton')
        },
        {
          type: 'button',
          id: 'next-file',
          title: trans('Next file'),
          icon: 'arrow',
          direction: 'right',
          visible: this.getToolbarButtonDisplay('showNextFileButton')
        },
        {
          type: 'spacer',
          id: 'spacer-one'
        },
        {
          type: 'button',
          class: 'share',
          id: 'export',
          title: trans('Export the current file'),
          icon: 'export'
        },
        {
          type: 'button',
          id: 'toggle-readability',
          title: trans('Toggle readability mode'),
          icon: 'eye',
          visible: this.getToolbarButtonDisplay('showToggleReadabilityButton')
        },
        {
          type: 'spacer',
          id: 'spacer-two',
          size: '1x'
        },
        {
          type: 'button',
          id: 'markdownComment',
          title: trans('Comment'),
          icon: 'code',
          visible: this.getToolbarButtonDisplay('showMarkdownCommentButton')
        },
        {
          type: 'button',
          id: 'markdownLink',
          title: trans('Link'),
          icon: 'link',
          visible: this.getToolbarButtonDisplay('showMarkdownLinkButton')
        },
        {
          type: 'button',
          id: 'markdownImage',
          title: trans('Image'),
          icon: 'image',
          visible: this.getToolbarButtonDisplay('showMarkdownImageButton')
        },
        {
          type: 'button',
          id: 'markdownMakeTaskList',
          title: trans('Tasklist'),
          icon: 'checkbox-list',
          visible: this.getToolbarButtonDisplay('showMarkdownMakeTaskListButton')
        },
        {
          type: 'button',
          id: 'insert-table',
          title: trans('Insert Table'),
          icon: 'table',
          visible: this.getToolbarButtonDisplay('showInsertTableButton')
        },
        {
          type: 'button',
          id: 'insertFootnote',
          title: trans('Footnote'),
          icon: 'footnote',
          visible: this.getToolbarButtonDisplay('showInsertFootnoteButton')
        },
        {
          type: 'spacer',
          id: 'spacer-three'
        },
        {
          type: 'text',
          align: 'center',
          id: 'document-info',
          content: this.parsedDocumentInfo,
          visible: this.getToolbarButtonDisplay('showDocumentInfoText')
        },
        {
          type: 'ring',
          id: 'pomodoro',
          title: trans('Pomodoro-Timer'),
          // Good morning, we are verbose here
          progressPercent: this.pomodoro.phase.elapsed / this.pomodoro.durations[this.pomodoro.phase.type] * 100,
          colour: this.pomodoro.colour[this.pomodoro.phase.type],
          visible: this.getToolbarButtonDisplay('showPomodoroButton')
        },
        {
          type: 'toggle',
          id: 'toggle-sidebar',
          title: trans('Toggle Sidebar'),
          icon: 'view-columns',
          initialState: this.sidebarVisible
        },
        {
          type: 'button',
          id: 'open-updater',
          title: trans('Update available'),
          icon: 'download',
          visible: this.isUpdateAvailable
        }
      ]
    },
    editorSidebarSplitComponent: function (): any {
      return this.$refs['editor-sidebar-split'] as any
    },
    fileManagerSplitComponent: function (): any {
      return this.$refs['file-manager-split'] as any
    },
    globalSearchComponent: function (): any {
      return this.$refs['global-search'] as any
    },
    paneConfiguration (): BranchNodeJSON|LeafNodeJSON {
      return this.$store.state.paneStructure as BranchNodeJSON|LeafNodeJSON
    },
    lastLeafId (): string|undefined {
      return this.$store.state.lastLeafId
    },
    distractionFree (): boolean {
      return this.$store.state.distractionFreeMode !== undefined
    }
  },
  watch: {
    sidebarVisible: function (newValue, oldValue) {
      if (newValue === true) {
        if (this.distractionFree === true) {
          this.$store.commit('leaveDistractionFree')
        }

        this.editorSidebarSplitComponent.unhide()
      } else {
        this.editorSidebarSplitComponent.hideView(2)
      }
    },
    fileManagerVisible: function (newValue, oldValue) {
      if (newValue === true) {
        if (this.distractionFree === true) {
          this.$store.commit('leaveDistractionFree')
        }

        this.fileManagerSplitComponent.unhide()
      } else {
        this.fileManagerSplitComponent.hideView(1)
      }
    },
    mainSplitViewVisibleComponent: function (newValue, oldValue) {
      if (newValue === 'globalSearch') {
        // The global search just became visible, so focus the query input
        nextTick().then(() => {
          this.globalSearchComponent.focusQueryInput()
        }).catch(e => console.error(e))
      }
    },
    distractionFree: function (newValue, oldValue) {
      if (newValue === true) {
        // Enter distraction free mode
        this.sidebarsBeforeDistractionfree = {
          fileManager: this.fileManagerVisible,
          sidebar: this.sidebarVisible
        }

        window.config.set('window.sidebarVisible', false)
        this.fileManagerVisible = false
      } else {
        // Leave distraction free mode
        window.config.set('window.sidebarVisible', this.sidebarsBeforeDistractionfree.sidebar)
        this.fileManagerVisible = this.sidebarsBeforeDistractionfree.fileManager
      }
    }
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, shortcut, state) => {
      if (shortcut === 'toggle-sidebar') {
        window.config.set('window.sidebarVisible', this.sidebarVisible === false)
      } else if (shortcut === 'insert-id') {
        // Generates an ID based upon the configured pattern, writes it into the
        // clipboard and then triggers the paste command on these webcontents.

        // First we need to backup the existing clipboard contents
        // so that they are not lost during the operation.
        let text = clipboard.readText()
        let html = clipboard.readHTML()
        let rtf = clipboard.readRTF()

        // Write an ID to the clipboard
        clipboard.writeText(generateId(window.config.get('zkn.idGen')))
        // Paste the ID
        ipcRenderer.send('window-controls', { command: 'paste' })

        // Now restore the clipboard's original contents
        setTimeout(() => {
          clipboard.write({ text, html, rtf })
        }, 10) // Why do a timeout? Because the paste event is asynchronous.
      } else if (shortcut === 'copy-current-id') {
        const activeFile = this.$store.getters.lastLeafActiveFile()
        ipcRenderer.invoke('application', {
          command: 'get-descriptor',
          payload: activeFile.path
        })
          .then(descriptor => {
            if (descriptor !== undefined && descriptor.id !== undefined && descriptor.id !== '') {
              clipboard.writeText(descriptor.id)
            }
          })
          .catch(err => console.error(err))
      } else if (shortcut === 'global-search') {
        this.fileManagerVisible = true
        this.mainSplitViewVisibleComponent = 'globalSearch'
        // Focus input
        if (this.$refs['global-search'] !== undefined) {
          nextTick()
            .then(() => { this.globalSearchComponent.focusQueryInput() })
            .catch(err => console.error(err))
        }
      } else if (shortcut === 'toggle-file-manager') {
        if (this.fileManagerVisible === true && this.mainSplitViewVisibleComponent === 'fileManager') {
          this.fileManagerVisible = false
        } else if (this.fileManagerVisible === false) {
          this.fileManagerVisible = true
          this.mainSplitViewVisibleComponent = 'fileManager'
        } else if (this.mainSplitViewVisibleComponent === 'globalSearch') {
          this.mainSplitViewVisibleComponent = 'fileManager'
        }
      } else if (shortcut === 'filter-files') {
        // We need to immediately make the file manager visible, which will
        // -- in the next tick -- focus its filter input.
        this.fileManagerVisible = true
        this.mainSplitViewVisibleComponent = 'fileManager'
      } else if (shortcut === 'export') {
        this.showExportPopover()
      } else if (shortcut === 'print') {
        if (this.activeFile !== null) {
          ipcRenderer.invoke('application', { command: 'print', payload: this.activeFile.path })
            .catch(err => console.error(err))
        }
      } else if (shortcut === 'navigate-back') {
        ipcRenderer.invoke('documents-provider', {
          command: 'navigate-back',
          payload: {
            windowId: this.windowId,
            leafId: this.lastLeafId
          }
        }).catch(err => console.error(err))
      } else if (shortcut === 'navigate-forward') {
        ipcRenderer.invoke('documents-provider', {
          command: 'navigate-forward',
          payload: {
            windowId: this.windowId,
            leafId: this.lastLeafId
          }
        }).catch(err => console.error(err))
      }
    })

    // Initially, we need to hide the sidebar, since the view will be visible
    // by default.
    if (this.sidebarVisible === false) {
      this.editorSidebarSplitComponent.hideView(2)
    }

    // Check if there is an update available.
    ipcRenderer.invoke('update-provider', { command: 'update-status' })
      .then((state: UpdateState) => {
        this.isUpdateAvailable = state.updateAvailable
      })
      .catch(err => console.error(err))

    // Also, listen for any changes in the update available state
    ipcRenderer.on('update-provider', (event, command: string, updateState: UpdateState) => {
      if (command === 'state-changed') {
        this.isUpdateAvailable = updateState.updateAvailable
      }
    })
  },
  methods: {
    genericJtl: function (lineNumber: number) {
      // This function is called from the sidebar where we already know the file
      // is open (because its editor component has provided the table of
      // contents in the first place).
      const doc = this.$store.getters.lastLeafActiveFile() as OpenDocument|null
      if (doc !== null) {
        this.editorCommands.data = { filePath: doc.path, lineNumber }
        this.editorCommands.jumpToLine = !this.editorCommands.jumpToLine
      }
    },
    jtl: function (filePath: string, lineNumber: number, newTab: boolean) {
      // We need to make sure the given file is (a) open somewhere and (b) the
      // active file.

      // Simplest case: The file is already active somewhere
      const activeFileLeaf: LeafNodeJSON|undefined = this.$store.state.paneData
        .find((pane: LeafNodeJSON) => pane.activeFile?.path === filePath)
      if (activeFileLeaf !== undefined) {
        // There is at least one leaf with the given file being active, so we
        // can simply emit the event
        this.editorCommands.data = { filePath, lineNumber }
        this.editorCommands.jumpToLine = !this.editorCommands.jumpToLine
        return
      }

      const WAIT_TIME = 100 // How long to wait before re-executing the jtl()

      // Next, let's see if the file is at least open somewhere
      const containingLeaf: LeafNodeJSON|undefined = this.$store.state.paneData
        .find((pane: LeafNodeJSON) => {
          return pane.openFiles.find(doc => doc.path === filePath) !== undefined
        })
      if (containingLeaf !== undefined) {
        // Let's first make it the active file and then execute the command
        ipcRenderer.invoke('documents-provider', {
          command: 'open-file',
          payload: { path: filePath, windowId: this.windowId, leafId: containingLeaf.id }
        })
          .then(() => {
            // Re-execute the jtl command
            setTimeout(() => this.jtl(filePath, lineNumber, newTab), WAIT_TIME)
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
          windowId: this.windowId,
          leafId: this.lastLeafId,
          newTab
        }
      })
        .then(() => {
          // Re-execute the jtl command
          setTimeout(() => this.jtl(filePath, lineNumber, newTab), WAIT_TIME)
        })
        .catch(e => console.error(e))
    },
    moveSection: function (data: { from: number, to: number }) {
      this.editorCommands.data = { from: data.from, to: data.to }
      this.editorCommands.moveSection = !this.editorCommands.moveSection
    },
    startGlobalSearch: function (terms: string) {
      this.mainSplitViewVisibleComponent = 'globalSearch'
      this.fileManagerVisible = true
      nextTick()
        .then(() => {
          this.globalSearchComponent.$data.query = terms
          this.globalSearchComponent.startSearch()
        })
        .catch(err => console.error(err))
    },
    toggleFileList: function () {
      // This event can be used by various components to ask the file manager to
      // toggle its file list visibility
      (this.$refs['file-manager'] as any).toggleFileList()
    },
    handleClick: function (clickedID: string) {
      if (clickedID === 'toggle-readability') {
        this.editorCommands.readabilityMode = !this.editorCommands.readabilityMode
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
            windowId: this.windowId,
            leafId: this.lastLeafId
          }
        }).catch(err => console.error(err))
      } else if (clickedID === 'next-file') {
        ipcRenderer.invoke('documents-provider', {
          command: 'navigate-forward',
          payload: {
            windowId: this.windowId,
            leafId: this.lastLeafId
          }
        }).catch(err => console.error(err))
      } else if (clickedID === 'export') {
        this.showExportPopover()
      } else if (clickedID === 'show-stats') {
        // The user wants to display the stats
        this.$togglePopover(
          PopoverStats,
          document.getElementById('toolbar-show-stats') as HTMLElement,
          {},
          (data: any) => {
            if (data.showMoreStats === true) {
              ipcRenderer.invoke('application', {
                command: 'open-stats-window'
              })
                .catch(err => console.error(err))
            }
            this.$closePopover()
          })
      } else if (clickedID === 'show-tag-cloud') {
        const button = document.getElementById('toolbar-show-tag-cloud')

        this.$togglePopover(PopoverTags, button as HTMLElement, {
          activeFile: this.$store.getters.lastLeafActiveFile()
        }, (data: any) => {
          if (data.searchForTag !== '') {
            // The user has clicked a tag and wants to search for it
            this.startGlobalSearch('#' + data.searchForTag)
            this.$closePopover()
          } else if (data.addSuggestionsToFile === true) {
            this.editorCommands.data = data.suggestions
            this.editorCommands.addKeywords = !this.editorCommands.addKeywords
            this.$closePopover()
          }
        })
      } else if (clickedID === 'pomodoro') {
        const data = {
          taskDuration: this.pomodoro.durations.task / 60,
          shortDuration: this.pomodoro.durations.short / 60,
          longDuration: this.pomodoro.durations.long / 60,
          currentPhase: this.pomodoro.phase.type,
          elapsed: this.pomodoro.phase.elapsed,
          isRunning: this.pomodoro.intervalHandle !== undefined,
          effect: this.pomodoro.currentEffectFile,
          // Data type magic ✨
          soundEffects: Object.fromEntries(new Map(SOUND_EFFECTS.map(effect => [ effect.file, effect.label ]))),
          volume: this.pomodoro.soundEffect.volume * 100
        }

        this.pomodoro.popover = this.$togglePopover(
          PopoverPomodoro,
          document.getElementById('toolbar-pomodoro') as HTMLElement,
          data,
          (data: any) => {
            // Update the durations as necessary
            this.pomodoro.durations.task = data.taskDuration
            this.pomodoro.durations.short = data.shortDuration
            this.pomodoro.durations.long = data.longDuration

            // Make sure to add a final sanity check for the actual values of the pomodoro since the
            // user can with some effort completely remove the time value
            if (typeof this.pomodoro.durations.task !== 'number' || this.pomodoro.durations.task < 1) {
              this.pomodoro.durations.task = 1
            }
            if (typeof this.pomodoro.durations.short !== 'number' || this.pomodoro.durations.short < 1) {
              this.pomodoro.durations.short = 1
            }
            if (typeof this.pomodoro.durations.long !== 'number' || this.pomodoro.durations.long < 1) {
              this.pomodoro.durations.long = 1
            }

            const effectChanged = data.effect !== this.pomodoro.currentEffectFile
            const volumeChanged = data.volume !== this.pomodoro.soundEffect.volume
            if (effectChanged) {
              this.pomodoro.currentEffectFile = data.effect
              this.pomodoro.soundEffect = new Audio(data.effect)
              this.pomodoro.soundEffect.volume = data.volume
            }

            if (volumeChanged) {
              this.pomodoro.soundEffect.volume = data.volume
            }

            if (effectChanged || volumeChanged) {
              this.pomodoro.soundEffect.pause()
              this.pomodoro.soundEffect.currentTime = 0
              this.pomodoro.soundEffect.play().catch(e => {
                /* We will be getting errors when pausing quickly */
              })
            }

            const shouldStart = this.pomodoro.intervalHandle === undefined && data.shouldBeRunning === true
            const shouldStop = this.pomodoro.intervalHandle !== undefined && data.shouldBeRunning === false

            if (shouldStart) {
              console.log('Starting pomodoro')
              this.pomodoro.soundEffect.pause()
              this.pomodoro.soundEffect.currentTime = 0
              this.startPomodoro()
              this.$closePopover()
            } else if (shouldStop) {
              console.log('Stopping pomodoro')
              this.pomodoro.soundEffect.pause()
              this.pomodoro.soundEffect.currentTime = 0
              this.stopPomodoro()
              this.$closePopover()
            } else {
              console.log('Doing nothing')
            }
          })
      } else if (clickedID === 'insert-table') {
        // Display the insertion popover
        const elem = document.getElementById('toolbar-insert-table')
        this.$togglePopover(PopoverTable, elem as HTMLElement, {}, (data: any) => {
          // Generate a simple table based on the info, and insert it.
          const ast: string[][] = []
          const align: any[] = []
          for (let i = 0; i < data.tableSize.rows; i++) {
            const row: string[] = []
            align.push('left')
            for (let k = 0; k < data.tableSize.cols; k++) {
              row.push('')
            }
            ast.push(row)
          }

          this.editorCommands.data = buildPipeTable(ast, align)
          this.editorCommands.replaceSelection = !this.editorCommands.replaceSelection
          this.$closePopover()
        })
      } else if (clickedID === 'document-info') {
        const data = {
          docInfo: this.$store.state.activeDocumentInfo,
          shouldCountChars: this.shouldCountChars
        }
        const elem = document.getElementById('toolbar-document-info')
        this.$togglePopover(PopoverDocInfo, elem as HTMLElement, data, (data: any) => {
          // Do nothing
        })
      } else if (clickedID.startsWith('markdown') === true && clickedID.length > 8) {
        // The user clicked a command button, so we just have to run that.
        this.editorCommands.data = clickedID
        this.editorCommands.executeCommand = !this.editorCommands.executeCommand
      } else if (clickedID === 'insertFootnote') {
        this.editorCommands.data = clickedID
        this.editorCommands.executeCommand = !this.editorCommands.executeCommand
      } else if (clickedID === 'open-updater') {
        ipcRenderer.invoke('application', {
          command: 'open-update-window'
        })
          .catch(err => console.error(err))
      }
    },
    handleToggle: function (controlState: { id: string, state: any }) {
      const { id, state } = controlState
      if (id === 'toggle-sidebar') {
        window.config.set('window.sidebarVisible', state)
      } else if (id === 'toggle-file-manager') {
        // Since this is a three-way-toggle, we have to inspect the state.
        this.fileManagerVisible = state !== undefined
        if (state !== undefined) {
          // Set the shown component to the correct one
          this.mainSplitViewVisibleComponent = state
        }
      }
    },
    startPomodoro: function () {
      // Starts a new pomodoro timer
      this.pomodoro.phase.type = 'task'
      this.pomodoro.phase.elapsed = 0

      this.pomodoro.intervalHandle = setInterval(() => {
        this.pomodoroTick()
      }, 1000)
    },
    pomodoroTick: function () {
      // Progresses the pomodoro counter by one second
      this.pomodoro.phase.elapsed += 1

      const currentPhaseDur = this.pomodoro.durations[this.pomodoro.phase.type]
      const phaseIsFinished = this.pomodoro.phase.elapsed === currentPhaseDur

      if (phaseIsFinished) {
        this.pomodoro.phase.elapsed = 0
        this.pomodoro.counter[this.pomodoro.phase.type] += 1

        if (this.pomodoro.phase.type === 'task' && this.pomodoro.counter.task % 4 === 0) {
          this.pomodoro.phase.type = 'long'
        } else if (this.pomodoro.phase.type === 'task') {
          this.pomodoro.phase.type = 'short'
        } else {
          // Both breaks lead to a new task
          this.pomodoro.phase.type = 'task'
        }

        this.pomodoro.soundEffect.play().catch(e => { /* We will be getting errors when pausing quickly */ })
      }

      // Finally handle the popover logic
      if (this.pomodoro.popover !== undefined && this.pomodoro.popover.isClosed() === false) {
        // The popover is visible, so let's update the data. Good thing is, we
        // only really need to update two things: The current task, and the
        // elapsed time.
        this.pomodoro.popover.updateData({
          internalCurrentPhase: this.pomodoro.phase.type,
          internalElapsed: this.pomodoro.phase.elapsed
        })
      } else if (this.pomodoro.popover !== undefined && this.pomodoro.popover.isClosed() === true) {
        this.pomodoro.popover = undefined // Cleanup
      }
    },
    stopPomodoro: function () {
      // Stops the pomodoro timer
      this.pomodoro.phase.type = 'task'
      this.pomodoro.phase.elapsed = 0
      this.pomodoro.counter.task = 0
      this.pomodoro.counter.short = 0
      this.pomodoro.counter.long = 0

      if (this.pomodoro.intervalHandle !== undefined) {
        clearInterval(this.pomodoro.intervalHandle)
        this.pomodoro.intervalHandle = undefined
      }
    },
    showExportPopover: function () {
      if (this.activeFile === null) {
        return // Can't export a non-open file
      }

      this.$togglePopover(
        PopoverExport,
        document.getElementById('toolbar-export') as HTMLElement,
        { filePath: this.activeFile.path },
        (data: any) => {
          if (data.closePopover === true) {
            this.$closePopover()
          }
        })
    },
    getToolbarButtonDisplay: function (configName: string): boolean {
      return this.$store.state.config['displayToolbarButtons.' + configName] === true
    }
  }
})
</script>

<style lang="less">
//
</style>
