<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="tabs[currentTab].label"
    v-bind:disable-vibrancy="true"
    v-on:tab="currentTab = $event"
  >
    <!--
      To comply with ARIA, we have to wrap the form in a tab container because
      we make use of the tabbar on the window chrome.
    -->
    <div
      v-bind:id="tabs[currentTab].controls"
      role="tabpanel"
      v-bind:aria-labelledby="tabs[currentTab].id"
    >
      <CalendarView
        v-if="currentTab === 0"
        v-bind:word-counts="wordCounts"
        v-bind:monthly-average="avgMonth"
      ></CalendarView>
      <ChartView
        v-if="currentTab === 1"
        v-bind:word-counts="wordCounts"
      ></ChartView>
      <FSALView
        v-if="currentTab === 2"
      ></FSALView>
    </div>
  </WindowChrome>
</template>

<script lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Stats
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The Statistics window app entry component.
 *
 * END HEADER
 */

import WindowChrome from '@common/vue/window/Chrome.vue'
import CalendarView from './CalendarView.vue'
import ChartView from './ChartView.vue'
import FSALView from './FSALView.vue'
import { trans } from '@common/i18n-renderer'
import { IpcRenderer } from 'electron'
import { defineComponent } from 'vue'
import { WindowTab } from '@dts/renderer/window'

const ipcRenderer: IpcRenderer = (window as any).ipc

interface Stats {
  wordCount: {[day: string]: number} // All words for the graph
  pomodoros: {[day: string]: number} // All pomodoros ever completed
  avgMonth: number // Monthly average
  today: number // Today's word count
  sumMonth: number // Overall sum for the past month
}

export default defineComponent({
  components: {
    WindowChrome,
    CalendarView,
    ChartView,
    FSALView
  },
  data: function () {
    return {
      currentTab: 0,
      tabs: [
        {
          label: trans('dialog.statistics.tabs.calendar_label'),
          controls: 'tab-calendar',
          id: 'tab-calendar-control',
          icon: 'calendar'
        },
        {
          label: trans('dialog.statistics.tabs.chart_label'),
          controls: 'tab-charts',
          id: 'tab-charts-control',
          icon: 'line-chart'
        },
        {
          label: trans('dialog.statistics.tabs.fsal_label'),
          controls: 'tab-fsal',
          id: 'tab-fsal-control',
          icon: 'file-group'
        }
      ] as WindowTab[],
      // After the data has been loaded, it will contain the following
      // properties (as of writing this):
      //
      // avgMonth: number
      // pomodoros: object [YYYY-MM-DD]: number
      // sumMonth: number
      // today: number
      // wordCount: object [YYYY-MM-DD]: number
      statisticsData: {} as Stats
    }
  },
  computed: {
    windowTitle: function (): string {
      if (process.platform === 'darwin') {
        return this.tabs[this.currentTab].label
      } else {
        return trans('dialog.statistics.title')
      }
    },
    wordCounts: function (): any {
      if (this.statisticsData.wordCount === undefined) {
        return {}
      } else {
        return this.statisticsData.wordCount
      }
    },
    avgMonth: function (): number {
      if (this.statisticsData.avgMonth === undefined) {
        return 0
      } else {
        return this.statisticsData.avgMonth
      }
    }
  },
  mounted: function () {
    // Initialise by loading the statistics data
    ipcRenderer.invoke('stats-provider', {
      command: 'get-data'
    })
      .then(data => {
        this.statisticsData = data
      })
      .catch(err => console.error(err))
  }
})
</script>

<style lang="less">
//
</style>
