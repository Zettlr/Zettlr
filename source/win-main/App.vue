<template>
  <WindowChrome
    v-bind:title="title"
    v-bind:titlebar="false"
    v-bind:menubar="true"
    v-bind:show-toolbar="true"
    v-bind:toolbar-controls="toolbarControls"
    v-on:toolbar-toggle="handleClick($event)"
    v-on:toolbar-click="handleClick($event)"
  >
    <SplitView
      v-bind:initial-size-percent="[ 20, 80 ]"
      v-bind:minimum-size-percent="10"
      v-bind:split="'horizontal'"
      v-bind:initial-total-width="$el.getBoundingClientRect().width"
    >
      <template #view1>
        <FileManager></FileManager>
      </template>
      <template #view2>
        <Tabs></Tabs>
        <Editor v-bind:readability-mode="readabilityActive"></Editor>
      </template>
    </SplitView>
    <Sidebar v-bind:show-sidebar="sidebarVisible"></Sidebar>
  </WindowChrome>
</template>

<script>
import WindowChrome from '../common/vue/window/Chrome'
import FileManager from './file-manager/file-manager'
import Sidebar from './Sidebar'
import Tabs from './Tabs'
import SplitView from './SplitView'
import Editor from './Editor'
import PopoverExport from './PopoverExport'
import PopoverStats from './PopoverStats'
import PopoverPomodoro from './PopoverPomodoro'
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
    Sidebar
  },
  data: function () {
    return {
      title: 'Zettlr',
      readabilityActive: false,
      sidebarVisible: false,
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
          type: 'button',
          id: 'open-workspace',
          title: 'menu.open_workspace',
          icon: 'folder-open'
        },
        {
          type: 'button',
          id: 'show-stats',
          title: 'toolbar.stats',
          icon: 'line-chart'
        },
        {
          type: 'button',
          id: 'show-tag-cloud',
          title: 'toolbar.tag_cloud',
          icon: 'tags'
        },
        {
          type: 'button',
          id: 'open-preferences',
          title: 'toolbar.preferences',
          icon: 'cog'
        },
        {
          type: 'spacer'
        },
        {
          type: 'button',
          class: 'share',
          id: 'export',
          title: 'toolbar.share',
          icon: 'export'
        },
        {
          type: 'button',
          id: 'bold',
          title: 'gui.formatting.bold',
          icon: 'bold'
        },
        {
          type: 'button',
          id: 'italic',
          title: 'gui.formatting.italic',
          icon: 'italic'
        },
        {
          type: 'button',
          id: 'code',
          title: 'gui.formatting.code',
          icon: 'code-alt'
        },
        {
          type: 'button',
          id: 'comment',
          title: 'gui.formatting.comment',
          icon: 'code'
        },
        {
          type: 'button',
          id: 'link',
          title: 'gui.formatting.link',
          icon: 'link'
        },
        {
          type: 'button',
          id: 'image',
          title: 'gui.formatting.image',
          icon: 'image'
        },
        {
          type: 'button',
          id: 'blockquote',
          title: 'gui.formatting.blockquote',
          icon: 'block-quote'
        },
        {
          type: 'button',
          id: 'ol',
          title: 'gui.formatting.ol',
          icon: 'number-list'
        },
        {
          type: 'button',
          id: 'ul',
          title: 'gui.formatting.ul',
          icon: 'bullet-list'
        },
        {
          type: 'button',
          id: 'tasklist',
          title: 'gui.formatting.tasklist',
          icon: 'checkbox-list'
        },
        {
          type: 'button',
          id: 'table',
          title: 'gui.formatting.insert_table',
          icon: 'table'
        },
        {
          type: 'button',
          id: 'divider',
          title: 'gui.formatting.divider',
          icon: 'minus'
        },
        {
          type: 'button',
          id: 'footnote',
          title: 'gui.formatting.footnote',
          icon: 'footnote'
        },
        {
          type: 'toggle',
          id: 'toggle-readability',
          title: 'toolbar.readability',
          icon: 'eye'
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
          title: 'toolbar.pomodoro',
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
      }
    })
  },
  methods: {
    handleClick: function (clickedID) {
      if (clickedID === 'toggle-readability') {
        this.readabilityActive = this.readabilityActive === false
      } else if (clickedID === 'toggle-sidebar') {
        this.sidebarVisible = this.sidebarVisible === false
      } else if (clickedID === 'open-workspace') {
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
              console.log('Should display stats window')
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

          const shouldStart = this.pomodoro.intervalHandle === undefined && data.isRunning
          const shouldStop = this.pomodoro.intervalHandle !== undefined && !data.isRunning

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
