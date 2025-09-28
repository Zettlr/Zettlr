<template>
  <div id="chart-container">
    <h1>{{ chartLabel }}</h1>

    <p>
      {{ chartIntro }}
    </p>

    <div class="chart">
      <div class="chart-area">
        <div class="chart-legend">
          <span class="legend-indicator primary"></span>
          <span>{{ legendThisWeek }}</span>
          <span class="legend-indicator secondary"></span>
          <span>{{ legendThisYear }}</span>
          <span class="legend-indicator tertiary"></span>
          <span>{{ legendLastYear }}</span>
        </div>
        <div
          v-for="mean, i in meansByWeekday.week"
          v-bind:key="i"
          class="bar-group"
        >
          <div
            class="bar primary"
            v-bind:style="`height: ${mean/(maxValue*1.1)*100+5}%`"
          >
          </div>
          <div
            class="bar secondary"
            v-bind:style="`height: ${meansByWeekday.year[i]/(maxValue*1.1)*100+5}%`"
          ></div>
          <div
            class="bar tertiary"
            v-bind:style="`height: ${meansByWeekday.lastYear[i]/(maxValue*1.1)*100+5}%`"
          ></div>
        </div>
      </div>
      <div class="x-axis">
        <p v-for="day in weekdays" v-bind:key="day" class="tick">
          {{ day }}
        </p>
      </div>
      <div class="y-axis">
        <p v-for="val in yTicks" v-bind:key="val" class="tick">
          {{ val }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ChartView
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays charts with word counts by time.
 *
 * END HEADER
 */

import { DateTime, type DateTimeMaybeValid } from 'luxon'
import { trans } from '@common/i18n-renderer'
import { computed } from 'vue'
import { useStatisticsStore } from '../pinia/statistics-store'

const statisticsStore = useStatisticsStore()

const weekdays = [
  trans('Monday'),
  trans('Tuesday'),
  trans('Wednesday'),
  trans('Thursday'),
  trans('Friday'),
  trans('Saturday'),
  trans('Sunday')
]

// Static properties
const chartLabel = trans('Charts')
const chartIntro = trans('This chart shows your current word count and compares it to the average of this and the previous year(s).')
const legendThisWeek = trans('This week')
const legendThisYear = trans('This year')
const legendLastYear = trans('Last year')

const today = DateTime.now()

const maxValue = computed(() => {
  return Math.max(...meansByWeekday.value.week, ...meansByWeekday.value.year, ...meansByWeekday.value.lastYear)
})

const minValue = computed(() => {
  return Math.min(...meansByWeekday.value.week, ...meansByWeekday.value.year, ...meansByWeekday.value.lastYear)
})

const yTicks = computed(() => {
  const range = maxValue.value - minValue.value
  const nTicks = 5
  const ticks = []
  for (let i = 0; i < nTicks; i++) {
    const interval = range / nTicks
    ticks.push(Math.round(minValue.value + i * interval))
  }
  return ticks.toReversed()
})

const meansByWeekday = computed(() => {
  // Take our words ...
  const words = Object.entries(statisticsStore.stats.wordCount)
    // ... map them to DateTimes ...
    .map<[ isoDate: DateTimeMaybeValid, count: number ]>(val => [ DateTime.fromISO(val[0]), val[1] ])
    // ... and filter out invalids.

  // Then, we need three arrays: this week, this year, and previous year.

  // First, filter out the numbers for this week.
  const lastMonday = today.minus({ days: today.weekday - 1 })
  const thisWeek = words.filter(val => val[0] >= lastMonday && val[0] <= today)

  const week = [ 0, 0, 0, 0, 0, 0, 0 ]
  for (const [ day, count ] of thisWeek) {
    week[day.weekday - 1] = count
  }

  // Next, we need averages for the entire year
  const year = words
    .filter(val => val[0].year === today.year)
    .reduce((acc, cur) => {
      acc[cur[0].weekday - 1].push(cur[1])
      return acc
    }, [ [], [], [], [], [], [], [] ] as number[][])
    .map(d => d.reduce((prev, cur) => prev + cur, 0) / d.length)
  
  const lastYear = words
    .filter(val => val[0].year === today.year - 1)
    .reduce((acc, cur) => {
      acc[cur[0].weekday - 1].push(cur[1])
      return acc
    }, [ [], [], [], [], [], [], [] ] as number[][])
    .map(d => d.reduce((prev, cur) => prev + cur, 0) / d.length)

  return { week, year, lastYear }
})
</script>

<style lang="less">
body div#chart-container {
  padding: 10px;
  height: 100%;
  display: flex;
  flex-direction: column;

  .chart {
    margin: 20px 0;
    height: 100%;
    width: 100%;
    display: grid;
    gap: 5px;
    grid-template-areas: "y-axis chart-area" "none x-axis";
    grid-template-columns: auto 1fr;
    grid-template-rows: 1fr auto;

    .chart-area {
      grid-area: chart-area;
      position: relative;
      display: flex;
      flex-direction: row;
      justify-content: space-evenly;
      gap: 10px;
      border: 2px solid gray;

      .bar-group {
        height: 100%;
        // Enforce even width of all elements
        flex-grow: 1;
        flex-basis: 0;

        display: flex;
        justify-content: center;
        align-items: end;
        gap: 5px;
  
        .bar {
          overflow: visible;
          width: 20px;
          border-top-right-radius: 4px;
          border-top-left-radius: 4px;
          background-color: gray;
          box-shadow: inset 4px 4px 4px 0px rgb(180 180 180 / 28%);
        }
      }
  
      .chart-legend {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 2px solid gray;
        padding: 4px;
        border-radius: 4px;
        top: 4px;
        left: 4px;
  
        span.legend-indicator {
          display: inline-block;
          width: 20px;
          height: 20px;
          border-radius: 4px;
        }
      }
    }

    .primary { background-color: rgb(51, 112, 254) !important; }
    .secondary { background-color: rgb(22, 200, 162) !important; }
    .tertiary { background-color: rgb(6, 131, 159) !important; }
  }


  .x-axis {
    display: flex;
    justify-content: space-evenly;
    grid-area: x-axis;

    .tick {
      // Enforce even width of all elements
      flex-grow: 1;
      flex-basis: 0;
      text-align: center;
    }
  }

  .y-axis {
    grid-area: y-axis;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 5% 0;

    .tick {
      // Enforce even width of all elements
      flex-grow: 1;
      flex-basis: 0;
      text-align: right;
      display: flex;
      justify-content: end;
      align-items: center;
    }
  }
}
</style>
