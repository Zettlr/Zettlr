<template>
  <PopoverWrapper v-bind:target="target" v-on:close="$emit('close')">
    <div id="stats-popover">
      <table>
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

<script lang="ts">
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

const ipcRenderer = window.ipc

export default {
  name: 'PopoverExport',
  components: {
    PopoverWrapper
  },
  props: {
    target: {
      type: HTMLElement,
      required: true
    }
  },
  emits: ['close'],
  data: function () {
    return {
      sumMonth: 0,
      averageMonth: 0,
      sumToday: 0,
      showMoreStats: false,
      wordCounts: {} satisfies Record<string, number>
    }
  },
  computed: {
    popoverData: function () {
      return {
        showMoreStats: this.showMoreStats
      }
    },
    svgWidth: function () {
      return 100
    },
    svgHeight: function () {
      return 20
    },
    wordCountsLastMonth: function () {
      // This function basically returns a list of the last 30 days of word counts
      const today = DateTime.now()
      const year = today.year
      const month = today.month
      const numDays = today.daysInMonth ?? 0
      const allKeys = Object.keys(this.wordCounts)
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
          dailyCounts.push(this.wordCounts[currentKey])
        } else {
          dailyCounts.push(0)
        }
      }
      return dailyCounts
    },
    getDailyCountsSVGPath: function () {
      // Retrieve the size, and substract a little bit padding
      const height = this.svgHeight - 2
      const width = this.svgWidth - 2
      const interval = width / this.wordCountsLastMonth.length
      let p = `M1 ${height} ` // Move to the bottom left
      let max = 1 // Prevent division by zero

      // Find the maximum word count
      for (const count of this.wordCountsLastMonth) {
        if (count > max) {
          max = count
        }
      }

      // Move to the right
      let position = interval
      for (const count of this.wordCountsLastMonth) {
        p += `L${position} ${height - count / max * height} `
        position += interval
      }

      // Finally return the path
      return p
    },
    displaySumMonth: function () {
      return localiseNumber(this.sumMonth)
    },
    displayAvgMonth: function () {
      return localiseNumber(this.averageMonth)
    },
    displaySumToday: function () {
      return localiseNumber(this.sumToday)
    },
    lastMonthLabel: function () {
      return trans('words last month')
    },
    averageLabel: function () {
      return trans('daily average')
    },
    todayLabel: function () {
      return trans('words today')
    },
    surpassedMessage: function () {
      return trans('🔥 You\'re on fire!')
    },
    closeToMessage: function () {
      return trans('💪 You\'re close to hitting your daily average!')
    },
    notReachedMessage: function () {
      return trans('✍🏼 Get writing to surpass your daily average.')
    },
    buttonLabel: function () {
      return trans('More statistics …')
    }
  },
  created: function () {
    console.log('Creating stats window')
    // Asynchronously pull in the data
    ipcRenderer.invoke('stats-provider', { command: 'get-data' }).then((stats: Stats) => {
      this.sumMonth = stats.sumMonth
      this.averageMonth = stats.avgMonth
      this.sumToday = stats.today
      this.wordCounts = stats.wordCount
    }).catch(e => console.error(e))
  },
  methods: {
    buttonClick: function () {
      ipcRenderer.invoke('application', { command: 'open-stats-window' })
        .catch(err => console.error(err))
      this.$emit('close')
    }
  }
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
