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
      <p v-if="sumToday > averageMonth">
        {{ surpassedMessage }}
      </p>
      <p v-else-if="sumToday > averageMonth / 2">
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
import { type Stats } from '@providers/stats'
import { DateTime } from 'luxon'
import { ref, computed } from 'vue'

const ipcRenderer = window.ipc

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

const sumMonth = ref(0)
const averageMonth = ref(0)
const sumToday = ref(0)
const wordCounts = ref<Record<string, number>>({})

const displaySumMonth = computed(() => localiseNumber(sumMonth.value))
const displayAvgMonth = computed(() => localiseNumber(averageMonth.value))
const displaySumToday = computed(() => localiseNumber(sumToday.value))

// Asynchronously pull in the data on setup
ipcRenderer.invoke('stats-provider', { command: 'get-data' })
  .then((stats: Stats) => {
    sumMonth.value = stats.sumMonth
    averageMonth.value = stats.avgMonth
    sumToday.value = stats.today
    wordCounts.value = stats.wordCount
  })
  .catch(e => console.error(e))

const wordCountsLastMonth = computed(() => {
  // This function basically returns a list of the last 30 days of word counts
  const today = DateTime.now()
  const year = today.year
  const month = today.month
  const numDays = today.daysInMonth ?? 0
  const allKeys = Object.keys(wordCounts.value)
  const dailyCounts = []
  for (let i = 1; i <= numDays; i++) {
    let day = i.toString()
    if (i < 10) {
      day = `0${i}`
    }

    let m = month.toString()
    if (month < 10) {
      m = `0${m}`
    }

    const currentKey = `${year}-${m}-${day}`
    if (allKeys.includes(currentKey)) {
      dailyCounts.push(wordCounts.value[currentKey])
    } else {
      dailyCounts.push(0)
    }
  }
  return dailyCounts
})

const getDailyCountsSVGPath = computed(() => {
  // Retrieve the size, and substract a little bit padding
  const height = svgHeight - 2
  const width = svgWidth - 2
  const interval = width / wordCountsLastMonth.value.length
  let p = `M1 ${height} ` // Move to the bottom left
  let max = 1 // Prevent division by zero

  // Find the maximum word count
  for (const count of wordCountsLastMonth.value) {
    if (count > max) {
      max = count
    }
  }

  // Move to the right
  let position = interval
  for (const count of wordCountsLastMonth.value) {
    p += `L${position} ${height - count / max * height} `
    position += interval
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
