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
      style="height: 100%;"
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
      <GraphView
        v-if="currentTab === 3"
      ></GraphView>
    </div>
  </WindowChrome>
</template>

<script setup lang="ts">
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
import { ref, computed, onMounted } from 'vue'
import { type WindowTab } from '@dts/renderer/window'
import GraphView from './GraphView.vue'
import { type Stats } from '@providers/stats'

const ipcRenderer = window.ipc

const tabs: WindowTab[] = [
  {
    label: trans('Calendar'),
    controls: 'tab-calendar',
    id: 'tab-calendar-control',
    icon: 'calendar'
  },
  {
    label: trans('Charts'),
    controls: 'tab-charts',
    id: 'tab-charts-control',
    icon: 'line-chart'
  },
  {
    label: trans('FSAL Stats'),
    controls: 'tab-fsal',
    id: 'tab-fsal-control',
    icon: 'file-group'
  },
  {
    label: 'Graph',
    controls: 'tab-graph',
    id: 'tab-graph-control',
    icon: 'network-globe'
  }
]

const currentTab = ref<number>(0)

const statisticsData = ref<Stats>({
  wordCount: {},
  pomodoros: {},
  avgMonth: 0,
  today: 0,
  sumMonth: 0
})

const windowTitle = computed<string>(() => {
  if (process.platform === 'darwin') {
    return tabs[currentTab.value].label
  } else {
    return trans('Writing statistics')
  }
})

const wordCounts = computed<Record<string, number>>(() => {
  return statisticsData.value.wordCount ?? {}
})

const avgMonth = computed<number>(() => {
  return statisticsData.value.avgMonth
})

onMounted(() => {
  ipcRenderer.invoke('stats-provider', { command: 'get-data' })
    .then(data => { statisticsData.value = data })
    .catch(err => console.error(err))
})
</script>

<style lang="less">
//
</style>
