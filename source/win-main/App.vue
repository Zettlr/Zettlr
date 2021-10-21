<template>
  <WindowChrome
    v-bind:title="title"
    v-bind:titlebar="false"
    v-bind:menubar="true"
    v-bind:show-toolbar="true"
    v-bind:toolbar-labels="false"
    v-bind:toolbar-controls="toolbarControls"
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
        ></FileManager>
        <!-- ... or the global search, if selected -->
        <GlobalSearch
          v-show="mainSplitViewVisibleComponent === 'globalSearch'"
          ref="global-search"
          v-on:jtl="$refs['editor'].jtl($event)"
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
            <DocumentTabs
              v-show="!distractionFree"
            ></DocumentTabs>
            <Editor
              ref="editor"
              v-bind:readability-mode="readabilityActive"
              v-bind:distraction-free="distractionFree"
            ></Editor>
          </template>
          <template #view2>
            <!-- Second side: Sidebar -->
            <Sidebar></Sidebar>
          </template>
        </SplitView>
      </template>
    </SplitView>
  </WindowChrome>
</template>

<script>
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

import WindowChrome from '../common/vue/window/Chrome'
import FileManager from './file-manager/file-manager'
import Sidebar from './Sidebar'
import DocumentTabs from './DocumentTabs'
import SplitView from '../common/vue/window/SplitView'
import GlobalSearch from './GlobalSearch'
import Editor from './Editor'
import PopoverExport from './PopoverExport'
import PopoverStats from './PopoverStats'
import PopoverTags from './PopoverTags'
import PopoverPomodoro from './PopoverPomodoro'
import PopoverTable from './PopoverTable'
import PopoverDocInfo from './PopoverDocInfo'
import { trans } from '../common/i18n-renderer'
import localiseNumber from '../common/util/localise-number'
import generateId from '../common/util/generate-id'

// Import the sound effects for the pomodoro timer
import glassFile from './assets/glass.wav'
import alarmFile from './assets/digital_alarm.mp3'
import chimeFile from './assets/chime.mp3'

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

export default {
  name: 'Main',
  components: {
    WindowChrome,
    FileManager,
    DocumentTabs,
    SplitView,
    Editor,
    GlobalSearch,
    Sidebar
  },
  data: function () {
    return {
      title: 'Zettlr',
      readabilityActive: false,
      sidebarVisible: false,
      fileManagerVisible: true,
      distractionFree: false,
      mainSplitViewVisibleComponent: 'fileManager',
      // Pomodoro state
      pomodoro: {
        currentEffectFile: glassFile,
        soundEffect: new Audio(glassFile),
        intervalHandle: undefined,
        popover: undefined,
        durations: {
          task: 1500,
          short: 300,
          long: 1200
        },
        phase: {
          type: 'task',
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
      sidebarsBeforeDistractionfree: {
        fileManager: true,
        sidebar: false
      }
    }
  },
  computed: {
    shouldCountChars: function () {
      return this.$store.state.config['editor.countChars']
    },
    parsedDocumentInfo: function () {
      const info = this.$store.state.activeDocumentInfo
      if (info === null) {
        return ''
      }

      let cnt = ''

      if (info.selections.length > 0) {
        // We have selections to display.
        let length = 0
        info.selections.forEach(sel => {
          length += sel.selectionLength
        })

        cnt = trans('gui.words_selected', localiseNumber(length))
        cnt += '<br>'
        if (info.selections.length === 1) {
          cnt += (info.selections[0].start.line + 1) + ':'
          cnt += (info.selections[0].start.ch + 1) + ' &ndash; '
          cnt += (info.selections[0].end.line + 1) + ':'
          cnt += (info.selections[0].end.ch + 1)
        } else {
          // Multiple selections --> indicate
          cnt += trans('gui.number_selections', info.selections.length)
        }
      } else {
        // No selection.
        const locID = (this.shouldCountChars === true) ? 'gui.chars' : 'gui.words'
        const num = (this.shouldCountChars === true) ? info.chars : info.words
        cnt = trans(locID, localiseNumber(num))
        cnt += '<br>'
        cnt += (info.cursor.line + 1) + ':' + (info.cursor.ch + 1)
      }

      return cnt
    },
    hasTagSuggestions: function () {
      return this.$store.state.tagSuggestions.length > 0
    },
    toolbarControls: function () {
      return [
        {
          type: 'three-way-toggle',
          id: 'toggle-file-manager',
          stateOne: {
            id: 'fileManager',
            title: trans('toolbar.toggle_file_manager'),
            icon: 'hard-disk'
          },
          stateTwo: {
            id: 'globalSearch',
            title: trans('toolbar.toggle_global_search'),
            icon: 'search'
          },
          initialState: (this.fileManagerVisible === true) ? this.mainSplitViewVisibleComponent : undefined
        },
        {
          type: 'button',
          id: 'open-workspace',
          title: trans('menu.open_workspace'),
          icon: 'folder-open'
        },
        {
          type: 'button',
          id: 'show-stats',
          title: trans('toolbar.stats'),
          icon: 'line-chart'
        },
        {
          type: 'button',
          id: 'show-tag-cloud',
          title: trans('toolbar.tag_cloud'),
          icon: 'tags',
          badge: this.hasTagSuggestions
        },
        {
          type: 'button',
          id: 'open-preferences',
          title: trans('toolbar.preferences'),
          icon: 'cog'
        },
        {
          type: 'spacer'
        },
        {
          type: 'button',
          class: 'share',
          id: 'export',
          title: trans('toolbar.share'),
          icon: 'export'
        },
        {
          type: 'toggle',
          id: 'toggle-readability',
          title: trans('toolbar.readability'),
          icon: 'eye'
        },
        {
          type: 'spacer',
          size: '1x'
        },
        {
          type: 'button',
          id: 'markdownComment',
          title: trans('gui.formatting.comment'),
          icon: 'code'
        },
        {
          type: 'button',
          id: 'markdownLink',
          title: trans('gui.formatting.link'),
          icon: 'link'
        },
        {
          type: 'button',
          id: 'markdownImage',
          title: trans('gui.formatting.image'),
          icon: 'image'
        },
        {
          type: 'button',
          id: 'markdownMakeTaskList',
          title: trans('gui.formatting.tasklist'),
          icon: 'checkbox-list'
        },
        {
          type: 'button',
          id: 'insert-table',
          title: trans('gui.formatting.insert_table'),
          icon: 'table'
        },
        {
          type: 'button',
          id: 'insertFootnote',
          title: trans('gui.formatting.footnote'),
          icon: 'footnote'
        },
        {
          type: 'spacer'
        },
        {
          type: 'text',
          align: 'center',
          id: 'document-info',
          content: this.parsedDocumentInfo
        },
        {
          type: 'ring',
          id: 'pomodoro',
          title: trans('toolbar.pomodoro'),
          // Good morning, we are verbose here
          progressPercent: this.pomodoro.phase.elapsed / this.pomodoro.durations[this.pomodoro.phase.type] * 100,
          colour: this.pomodoro.colour[this.pomodoro.phase.type]
        },
        {
          type: 'toggle',
          id: 'toggle-sidebar',
          title: trans('menu.toggle_sidebar'),
          icon: 'view-columns',
          initialState: this.sidebarVisible === true
        }
      ]
    }
  },
  watch: {
    sidebarVisible: function (newValue, oldValue) {
      if (newValue === true) {
        if (this.distractionFree === true) {
          this.distractionFree = false
        }

        this.$refs['editor-sidebar-split'].unhide()
      } else {
        this.$refs['editor-sidebar-split'].hideView(2)
      }
    },
    fileManagerVisible: function (newValue, oldValue) {
      if (newValue === true) {
        if (this.distractionFree === true) {
          this.distractionFree = false
        }

        this.$refs['file-manager-split'].unhide()
      } else {
        this.$refs['file-manager-split'].hideView(1)
      }
    },
    mainSplitViewVisibleComponent: function (newValue, oldValue) {
      if (newValue === 'globalSearch') {
        // The global search just became visible, so make sure to change the
        // current directory.
        this.$refs['global-search'].setCurrentDirectory()
      }
    }
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, shortcut, state) => {
      if (shortcut === 'toggle-sidebar') {
        this.sidebarVisible = this.sidebarVisible === false
      } else if (shortcut === 'insert-id') {
        // Generates an ID based upon the configured pattern, writes it into the
        // clipboard and then triggers the paste command on these webcontents.

        // First we need to backup the existing clipboard contents
        // so that they are not lost during the operation.
        let text = clipboard.readText()
        let html = clipboard.readHTML()
        let rtf = clipboard.readRTF()

        // Write an ID to the clipboard
        clipboard.writeText(generateId(global.config.get('zkn.idGen')))
        // Paste the ID
        ipcRenderer.send('window-controls', { command: 'paste' })

        // Now restore the clipboard's original contents
        setTimeout((e) => {
          clipboard.write({
            'text': text,
            'html': html,
            'rtf': rtf
          })
        }, 10) // Why do a timeout? Because the paste event is asynchronous.
      } else if (shortcut === 'copy-current-id') {
        const activeFile = this.$store.state.activeFile

        if (activeFile !== null && activeFile.id !== '') {
          clipboard.writeText(activeFile.id)
        }
      } else if (shortcut === 'global-search') {
        this.fileManagerVisible = true
        this.mainSplitViewVisibleComponent = 'globalSearch'
        // Focus input
        if (this.$refs['global-search'] !== undefined) {
          this.$nextTick(() => {
            this.$refs['global-search'].focusQueryInput()
          })
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
      } else if (shortcut === 'toggle-distraction-free') {
        if (this.distractionFree === false) {
          // Enter distraction free mode
          this.sidebarsBeforeDistractionfree = {
            fileManager: this.fileManagerVisible,
            sidebar: this.sidebarVisible
          }

          this.distractionFree = true
          this.sidebarVisible = false
          this.fileManagerVisible = false
        } else {
          // Leave distraction free mode
          this.distractionFree = false
          this.sidebarVisible = this.sidebarsBeforeDistractionfree.sidebar
          this.fileManagerVisible = this.sidebarsBeforeDistractionfree.fileManager
        }
      }
    })

    // Initially, we need to hide the sidebar, since the view will be visible
    // by default.
    this.$refs['editor-sidebar-split'].hideView(2)

    this.$on('start-global-search', (terms) => {
      this.mainSplitViewVisibleComponent = 'globalSearch'
      this.fileManagerVisible = true
      this.$nextTick(() => {
        this.$refs['global-search'].$data.query = terms
        this.$refs['global-search'].startSearch()
      })
    })

    this.$on('toggle-file-list', () => {
      // This event can be used by various components to ask the file manager to
      // toggle its file list visibility
      this.$refs['file-manager'].toggleFileList()
    })
  },
  methods: {
    handleClick: function (clickedID) {
      if (clickedID === 'open-workspace') {
        ipcRenderer.invoke('application', { command: 'open-workspace' })
          .catch(e => console.error(e))
      } else if (clickedID === 'open-preferences') {
        ipcRenderer.invoke('application', { command: 'open-preferences' })
          .catch(e => console.error(e))
      } else if (clickedID === 'export') {
        this.showExportPopover()
      } else if (clickedID === 'show-stats') {
        // The user wants to display the stats
        this.$togglePopover(PopoverStats, document.getElementById('toolbar-show-stats'), {}, (data) => {
          if (data.showMoreStats === true) {
            ipcRenderer.invoke('application', {
              command: 'open-stats-window'
            })
              .catch(err => console.error(err))
          }
          this.$closePopover()
        })
      } else if (clickedID === 'show-tag-cloud') {
        const allTags = Object.keys(this.$store.state.tagDatabase)
        const tagMap = allTags.map(tag => {
          // Tags have the properties "className", "count", and "text"
          const storeTag = this.$store.state.tagDatabase[tag]

          return {
            className: storeTag.className,
            count: storeTag.count,
            text: storeTag.text
          }
        })

        const data = {
          tags: tagMap,
          suggestions: this.$store.state.tagSuggestions
        }

        const button = document.getElementById('toolbar-show-tag-cloud')

        this.$togglePopover(PopoverTags, button, data, (data) => {
          if (data.searchForTag !== '') {
            // The user has clicked a tag and wants to search for it
            this.$emit('start-global-search', '#' + data.searchForTag)
            this.$closePopover()
          } else if (data.addSuggestionsToFile === true) {
            this.$refs.editor.addKeywordsToFile(data.suggestions)
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

        this.pomodoro.popover = this.$togglePopover(PopoverPomodoro, document.getElementById('toolbar-pomodoro'), data, (data) => {
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

          const shouldStart = this.pomodoro.intervalHandle === undefined && data.isRunning === true
          const shouldStop = this.pomodoro.intervalHandle !== undefined && data.isRunning === false

          if (shouldStart) {
            this.pomodoro.soundEffect.pause()
            this.pomodoro.soundEffect.currentTime = 0
            this.startPomodoro()
            this.$closePopover()
          } else if (shouldStop) {
            this.pomodoro.soundEffect.pause()
            this.pomodoro.soundEffect.currentTime = 0
            this.stopPomodoro()
            this.$closePopover()
          }
        })
      } else if (clickedID === 'insert-table') {
        // Display the insertion popover
        const data = {}
        const elem = document.getElementById('toolbar-insert-table')
        this.$togglePopover(PopoverTable, elem, data, (data) => {
          // Generate a simple table based on the info, and insert it.
          let table = ''
          for (let i = 0; i < data.tableSize.rows; i++) {
            table += '|'
            for (let k = 0; k < data.tableSize.cols; k++) {
              table += '   |'
            }
            table += '\n'
          }

          // This seems hacky, but it's not that bad, I think.
          this.$refs['editor'].editor.codeMirror.replaceSelection(table)
          this.$closePopover()
        })
      } else if (clickedID === 'document-info') {
        const data = {
          docInfo: this.$store.state.activeDocumentInfo
        }
        const elem = document.getElementById('toolbar-document-info')
        this.$togglePopover(PopoverDocInfo, elem, data, (data) => {
          // Do nothing
        })
      } else if (clickedID.startsWith('markdown') === true && clickedID.length > 8) {
        // The user clicked a command button, so we just have to run that.
        this.$refs['editor'].executeCommand(clickedID)
      } else if (clickedID === 'insertFootnote') {
        this.$refs.editor.executeCommand(clickedID)
      }
    },
    handleToggle: function (controlState) {
      const { id, state } = controlState
      if (id === 'toggle-readability') {
        this.readabilityActive = state // For simple toggles, the state is just a boolean
      } else if (id === 'toggle-sidebar') {
        this.sidebarVisible = state
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
          currentPhase: this.pomodoro.phase.type,
          elapsed: this.pomodoro.phase.elapsed
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

      clearInterval(this.pomodoro.intervalHandle)
      this.pomodoro.intervalHandle = undefined
    },
    showExportPopover: function () {
      if (this.$store.state.activeFile === null) {
        return // Can't export a non-open file
      }
      const data = {
        format: this.$store.state.config['export.singleFileLastExporter']
      }
      this.$togglePopover(PopoverExport, document.getElementById('toolbar-export'), data, (data) => {
        if (data.shouldExport === true) {
          // Remember the last choice
          global.config.set('export.singleFileLastExporter', data.format)
          // Run the exporter
          ipcRenderer.invoke('application', {
            command: 'export',
            payload: {
              format: data.format,
              options: data.formatOptions,
              exportTo: data.exportTo,
              file: this.$store.state.activeFile.path
            }
          })
            .catch(e => console.error(e))
          this.$closePopover()
        }
      })
    }
  }
}
</script>

<style lang="less">
//
</style>
