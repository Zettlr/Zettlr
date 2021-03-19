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
      v-bind:minimum-size-percent="[ 10, 70 ]"
      v-bind:split="'horizontal'"
    >
      <template #view1>
        <!-- File manager in the left side of the split view -->
        <FileManager
          v-show="mainSplitViewVisibleComponent === 'fileManager'"
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
            <Tabs></Tabs>
            <Editor
              ref="editor"
              v-bind:readability-mode="readabilityActive"
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
import WindowChrome from '../common/vue/window/Chrome'
import FileManager from './file-manager/file-manager'
import Sidebar from './Sidebar'
import Tabs from './Tabs'
import SplitView from '../common/vue/window/SplitView'
import GlobalSearch from './GlobalSearch'
import Editor from './Editor'
import PopoverExport from './PopoverExport'
import PopoverStats from './PopoverStats'
import PopoverPomodoro from './PopoverPomodoro'
import PopoverTable from './PopoverTable'
import { trans } from '../common/i18n'
import localiseNumber from '../common/util/localise-number'
import generateId from '../common/util/generate-id'
import { ipcRenderer, clipboard } from 'electron'

// Import the sound effects for the pomodoro timer
import glassFile from './assets/glass.wav'
import alarmFile from './assets/digital_alarm.mp3'
import chimeFile from './assets/chime.mp3'

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
    Tabs,
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
      mainSplitViewVisibleComponent: 'fileManager',
      // Pomodoro state
      pomodoro: {
        currentEffectFile: glassFile,
        soundEffect: new Audio(glassFile),
        intervalHandle: undefined,
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
      }
    }
  },
  computed: {
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
        // No selection. NOTE: words always contains the count of chars OR words.
        cnt = trans('gui.words', localiseNumber(info.words))
        cnt += '<br>'
        cnt += (info.cursor.line + 1) + ':' + (info.cursor.ch + 1)
      }

      return cnt
    },
    toolbarControls: function () {
      return [
        {
          type: 'three-way-toggle',
          id: 'toggle-file-manager',
          stateOne: {
            id: 'fileManager',
            title: 'Toggle file manager',
            icon: 'hard-disk'
          },
          stateTwo: {
            id: 'globalSearch',
            title: 'Toggle search window',
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
          icon: 'tags'
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
          title: 'Export', // title: trans('toolbar.share'),
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
          id: 'markdownBold',
          title: trans('gui.formatting.bold'),
          icon: 'bold'
        },
        {
          type: 'button',
          id: 'markdownItalic',
          title: trans('gui.formatting.italic'),
          icon: 'italic'
        },
        {
          type: 'button',
          id: 'markdownCode',
          title: trans('gui.formatting.code'),
          icon: 'code-alt'
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
          id: 'markdownBlockquote',
          title: trans('gui.formatting.blockquote'),
          icon: 'block-quote'
        },
        {
          type: 'button',
          id: 'markdownMakeOrderedList',
          title: trans('gui.formatting.ol'),
          icon: 'number-list'
        },
        {
          type: 'button',
          id: 'markdownMakeUnorderedList',
          title: trans('gui.formatting.ul'),
          icon: 'bullet-list'
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
          title: 'menu.toggle_sidebar',
          icon: 'view-columns',
          initialState: (this.sidebarVisible === true) ? 'active' : ''
        }
      ]
    }
  },
  watch: {
    sidebarVisible: function (newValue, oldValue) {
      if (newValue === true) {
        this.$refs['editor-sidebar-split'].unhide()
      } else {
        this.$refs['editor-sidebar-split'].hideView(2)
      }
    },
    fileManagerVisible: function (newValue, oldValue) {
      if (newValue === true) {
        this.$refs['file-manager-split'].unhide()
      } else {
        this.$refs['file-manager-split'].hideView(1)
      }
    }
  },
  mounted: function () {
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'toggle-sidebar') {
        this.sidebarVisible = this.sidebarVisible === false
      } else if (shortcut === 'insert-id') {
        // Generates an ID based upon the configured pattern, writes it into the
        // clipboard and then triggers the paste command on these webcontents.

        // First we need to backup the existing clipboard contents
        // so that they are not lost during the operation.
        let text = clipboard.readText()
        let html = clipboard.readHTML()
        let image = clipboard.readImage()
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
            'image': image,
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
      } else if (shortcut === 'toggle-file-manager') {
        if (this.fileManagerVisible === true && this.mainSplitViewVisibleComponent === 'fileManager') {
          this.fileManagerVisible = false
        } else if (this.fileManagerVisible === false) {
          this.fileManagerVisible = true
          this.mainSplitViewVisibleComponent = 'fileManager'
        } else if (this.mainSplitViewVisibleComponent === 'globalSearch') {
          this.mainSplitViewVisibleComponent = 'fileManager'
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
        if (this.$store.state.activeFile === null) {
          return // Can't export a non-open file
        }
        const data = {
          exportDirectory: this.$store.state.config['export.dir']
        }
        this.$showPopover(PopoverExport, document.getElementById('toolbar-export'), data, (data) => {
          if (data.shouldExport === true) {
            ipcRenderer.invoke('application', {
              command: 'export',
              payload: {
                format: data.format,
                exportTo: data.exportTo,
                file: this.$store.state.activeFile.path
              }
            })
              .catch(e => console.error(e))
            this.$closePopover()
          }
        })
      } else if (clickedID === 'show-stats') {
        // The user wants to display the stats
        ipcRenderer.invoke('stats-provider', { command: 'get-data' }).then(stats => {
          const data = {
            sumMonth: stats.sumMonth,
            averageMonth: stats.avgMonth,
            sumToday: stats.today,
            wordCounts: stats.wordCount
          }

          this.$showPopover(PopoverStats, document.getElementById('toolbar-show-stats'), data, (data) => {
            if (data.showMoreStats === true) {
              ipcRenderer.invoke('application', {
                command: 'open-stats-window'
              })
                .catch(err => console.error(err))
            }
            this.$closePopover()
          })
        }).catch(e => console.error(e))
      } else if (clickedID === 'pomodoro') {
        // TODO: Show pomodoro progress
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

        this.$showPopover(PopoverPomodoro, document.getElementById('toolbar-pomodoro'), data, (data) => {
          // Update the durations as necessary
          this.pomodoro.durations.task = data.taskDuration
          this.pomodoro.durations.short = data.shortDuration
          this.pomodoro.durations.long = data.longDuration

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
        this.$showPopover(PopoverTable, document.getElementById('toolbar-insert-table'), {}, (data) => {
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
      } else if (clickedID.startsWith('markdown') === true && clickedID.length > 8) {
        // The user clicked a command button, so we just have to run that.
        this.$refs['editor'].executeCommand(clickedID)
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
    }
  }
}
</script>

<style lang="less">
//
</style>
