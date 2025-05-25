<template>
  <PopoverWrapper v-bind:target="props.target" v-on:close="$emit('close')">
    <div id="stats-popover">
      <table>
        <tbody>
          <tr>
            <td style="text-align: right;">
              <strong>{{ displaySumMonth }}</strong>
            </td>
            <td>{{ lastMonthLabel }}</td>
          </tr>
          <tr>
            <td style="text-align: right;">
              <strong>{{ displayAvgMonth }}</strong>
            </td>
            <td>{{ averageLabel }}</td>
          </tr>
          <tr>
            <td style="text-align: right;">
              <strong>{{ displaySumToday }}</strong>
            </td>
            <td>{{ todayLabel }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="statisticsStore.todayWords > statisticsStore.avg30DaysWords">
        {{ surpassedMessage }}
      </p>
      <p v-else-if="statisticsStore.todayWords > statisticsStore.avg30DaysWords / 2">
        {{ closeToMessage }}
      </p>
      <p v-else>
        {{ notReachedMessage }}
      </p>
      <div id="stats-counter-container">
        <svg
          v-bind:width="svgWidth"
          v-bind:height="svgHeight"
          title="These are the current month's word counts"
        >
          <path v-bind:d="getDailyCountsSVGPath"></path>
        </svg>
        <button v-on:click="buttonClick">
          {{ buttonLabel }}
        </button>
      </div>
    </div>
  </PopoverWrapper>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Stats Popover
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file displays a comprehensive stats overview.
 *
 * END HEADER
 */

import PopoverWrapper from './PopoverWrapper.vue'
import { trans } from '@common/i18n-renderer'
import localiseNumber from '@common/util/localise-number'
import { useStatisticsStore } from 'source/pinia'
import { computed } from 'vue'

const ipcRenderer = window.ipc

const statisticsStore = useStatisticsStore()

const svgWidth = 100
const svgHeight = 20

const lastMonthLabel = trans('words last month')
const averageLabel = trans('daily average')
const todayLabel = trans('words today')
const surpassedMessage = trans('🔥 You\'re on fire!')
const closeToMessage = trans('💪 You\'re close to hitting your daily average!')
const notReachedMessage = trans('✍🏼 Get writing to surpass your daily average.')
const buttonLabel = trans('More statistics …')

const emit = defineEmits<(e: 'close') => void>()

const props = defineProps<{ target: HTMLElement }>()

const displaySumMonth = computed(() => localiseNumber(statisticsStore.sum30DaysWords))
const displayAvgMonth = computed(() => localiseNumber(Math.round(statisticsStore.avg30DaysWords)))
const displaySumToday = computed(() => localiseNumber(statisticsStore.todayWords))

const getDailyCountsSVGPath = computed(() => {
  const data = statisticsStore.wordsLast30CalendarDays

  // Retrieve the size, and substract a little bit padding
  const padding = 1
  const height = svgHeight - padding * 2
  const width = svgWidth - padding * 2
  const interval = Math.round(width / 30)

  // Ensure `max` is at least 1 to prevent division by zero
  const max = Math.max(1, Math.max(...data.map(x => x[1])))

  let p = `M${padding} ${svgHeight - padding} ` // Move to the bottom left

  // Move to the right by 1/30th for each day
  let x = interval
  for (const [ iso, count ] of data) {
    // Use the word count, or 0
    // const count = wordsLastMonth.find(x => x[0] === iso)?.[1] ?? 0
    p += `L${x} ${height - Math.round((count / max) * height)} `
    x += interval
  }

  // Finally return the path
  return p
})

function buttonClick (): void {
  ipcRenderer.invoke('application', { command: 'open-stats-window' })
    .catch(err => console.error(err))
  emit('close')
}
</script>

<style lang="less">
body div#stats-popover {
  padding: 10px;
  table {
    width: 100%;
  }

  p {
    margin: 10px 0;
  }

  div#stats-counter-container {
    display: flex;
    align-items: center;
    justify-content: space-evenly;

    svg {
      fill: transparent;
      stroke: #333333;
    }
  }
}

body.dark div#stats-popover {
  div#stats-counter-container {
    svg { stroke: #dddddd; }
  }
}
</style>
