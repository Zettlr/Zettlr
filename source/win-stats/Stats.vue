<template>
  <WindowChrome
    v-bind:title="windowTitle"
    v-bind:titlebar="true"
    v-bind:menubar="false"
    v-bind:show-tabbar="true"
    v-bind:tabbar-tabs="tabs"
    v-bind:tabbar-label="'Preferences'"
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
    </div>
  </WindowChrome>
</template>

<script>
import { ipcRenderer } from 'electron'
import WindowChrome from '../common/vue/window/Chrome.vue'
import CalendarView from './CalendarView.vue'
import ChartView from './ChartView.vue'

export default {
  name: 'Stats',
  components: {
    WindowChrome,
    CalendarView,
    ChartView
  },
  data: function () {
    return {
      currentTab: 0,
      tabs: [
        {
          label: 'Calendar', // TODO: Translate
          controls: 'tab-calendar',
          id: 'tab-calendar-control',
          icon: 'calendar'
        },
        {
          label: 'Charts', // TODO: Translate
          controls: 'tab-charts',
          id: 'tab-charts-control',
          icon: 'line-chart'
        }
      ],
      // After the data has been loaded, it will contain the following
      // properties (as of writing this):
      //
      // avgMonth: number
      // pomodoros: object [YYYY-MM-DD]: number
      // sumMonth: number
      // today: number
      // wordCount: object [YYYY-MM-DD]: number
      statisticsData: {}
    }
  },
  computed: {
    windowTitle: function () {
      if (document.body.classList.contains('darwin')) {
        return this.tabs[this.currentTab].label
      } else {
        return 'Stats'
      }
    },
    wordCounts: function () {
      if (this.statisticsData.wordCount === undefined) {
        return {}
      } else {
        return this.statisticsData.wordCount
      }
    },
    avgMonth: function () {
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
}
</script>

<style lang="less">
//
</style>
