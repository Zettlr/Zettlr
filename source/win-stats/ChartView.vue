<template>
  <div id="chart-container">
    <!--
      The chart view enables users to view the following data:

      1. By default the current week (UOA: Day)
      2. The current month (UOA: Day)
      3. The current year (UOA: Week)

      A toggle allows the users to compare the current one with all others
      of the same level. That is: All weeks (of the current year), all months,
      and all years.

      This means, at maximum, you will have: 52 lines for weeks,
      12 lines for month, and x lines for years.

      If the compare-toggle is on, switching to different timeframes will take
      the next-higher unit of analysis. So if you're comparing weeks, the switch
      will rotate between years, just as with months. And with years, you'll
      not have a switch at all. I'll change that probably in 2028, because then
      the first people will have a decade of years, but even then it would only
      be ten lines. I think anything below 52 is okay-ish :D
    -->
    <h1>{{ chartLabel }} {{ currentYear }}</h1>
    <ButtonControl
      v-bind:disabled="unit === 'year' || currentYear <= earliestYear"
      v-bind:icon="'angle'"
      v-bind:direction="'left'"
      v-bind:label="String(currentYear - 1)"
      v-bind:inline="true"
      v-on:click="prevYear()"
    >
    </ButtonControl>
    <SelectControl
      v-model="unit"
      v-bind:options="{
        'month': 'Month',
        'year': 'Year'
      }"
      v-bind:inline="true"
    ></SelectControl>
    <ButtonControl
      v-bind:disabled="unit === 'year' || currentYear >= latestYear"
      v-bind:icon="'angle'"
      v-bind:direction="'right'"
      v-bind:label="String(currentYear + 1)"
      v-bind:inline="true"
      v-on:click="nextYear()"
    >
    </ButtonControl>
    <!-- Now finally the canvas -->
    <div id="chart-canvas-container">
      <canvas
        ref="chartCanvas"
        width="400"
        height="250"
        aria-label="Main Chart Display"
        role="img"
      ></canvas>
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

import { DateTime } from 'luxon'
import { trans } from '@common/i18n-renderer'
import {
  Chart,
  type ChartData,
  type ChartDataset,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement
} from 'chart.js'
import SelectControl from '@common/vue/form/elements/SelectControl.vue'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useStatisticsStore } from '../pinia/statistics-store'

const statisticsStore = useStatisticsStore()

// Register the components of Chart.js which we need
Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement)

// Static properties
const chartLabel = trans('Charts')

let chart: Chart|null = null

const currentYear = ref<number>(DateTime.local().year)
const unit = ref<'month'|'year'>('month')
const chartCanvas = ref<HTMLCanvasElement|null>(null)

const earliestYear = computed<number>(() => {
  return Math.min(
    ...Object
      .keys(statisticsStore.stats.wordCount)
      .map(k => parseInt(k.substring(0, 4), 10))
  )
})

const latestYear = computed<number>(() => {
  const years = Object.keys(statisticsStore.stats.wordCount).map(k => parseInt(k.substring(0, 4), 10))
  let max = -Infinity
  for (const year of years) {
    if (max < year) {
      max = year
    }
  }

  return max
})

const earliestMonth = computed<number>(() => {
  // Returns the earliest month given the current _year_
  const months = Object.keys(statisticsStore.stats.wordCount).filter(k => {
    const year = parseInt(k.substring(0, 4), 10)
    return year === currentYear.value
  }).map(k => {
    return parseInt(k.substring(5, 7), 10)
  })

  let min = +Infinity
  for (const month of months) {
    if (min > month) {
      min = month
    }
  }
  return min
})

const latestMonth = computed<number>(() => {
  const months = Object.keys(statisticsStore.stats.wordCount).filter(k => {
    const year = parseInt(k.substring(0, 4), 10)
    return year === currentYear.value
  }).map(k => {
    return parseInt(k.substring(5, 7), 10)
  })

  let max = -Infinity
  for (const month of months) {
    if (max < month) {
      max = month
    }
  }
  return max
})

/**
 * Returns year datasets
 *
 * @return  {Array}  An array for year-datasets
 */
const years = computed<ChartData>(() => {
  // Years are computed on a week-wise basis
  const datasets: ChartDataset[] = []
  const labels: string[] = []

  for (let i = earliestYear.value; i <= latestYear.value; i++) {
    // Initialise some variables: The beginning (Jan 1st), the end (probably
    // Dec 31st, but I don't take any bets, as to why, see this video:
    // https://youtu.be/-5wpm-gesOY).
    let pointer = DateTime.local(i, 1, 1)
    const end = pointer.endOf('year')
    // We need to store the current week we're in because yearly statistics
    // are calculated on a per-week basis.
    let lastWeek = pointer.weekNumber

    // Each dataset needs to conform to Chart.js's config
    // TODO: Better algorithm for the colours
    const randR = Math.random() * 255
    const randG = Math.random() * 255
    const randB = Math.random() * 255
    const year: ChartDataset = {
      label: String(pointer.year),
      pointRadius: 0,
      borderColor: `rgba(${randR}, ${randG}, ${randB}, 0.7)`,
      backgroundColor: `rgba(${randR}, ${randG}, ${randB}, 0.7)`, // Necessary for tooltips
      pointHoverBorderColor: `rgba(${randR}, ${randG}, ${randB}, 1.0)`,
      pointHoverBackgroundColor: `rgba(${randR}, ${randG}, ${randB}, 1.0)`,
      tension: 0.0,
      fill: false,
      data: []
    }

    // Now, basically go over all days in the year. As soon as the diff
    // between pointer and end is bigger than zero, the pointer is in the
    // next year, and that's when we stop.
    while (pointer.diff(end, 'days').days <= 0) {
      let weekCount = 0

      // As long as we're in the same week, add up all daily counts.
      while (pointer.weekNumber === lastWeek) {
        const dayCount = statisticsStore.stats.wordCount[pointer.toFormat('yyyy-MM-dd')]
        if (dayCount !== undefined) {
          weekCount += dayCount
        }
        // Progress one day.
        pointer = pointer.plus({ days: 1 })
      }

      const weekLabel = `Week ${lastWeek}`
      if (!labels.includes(weekLabel)) {
        // Prevent pushing this label multiple times
        labels.push(weekLabel)
      }

      // We're in the next week, store the current pointer's (= next) week
      lastWeek = pointer.weekNumber

      // Also, add the data point, using pointer minus 1 day to stay in the
      // last week.
      year.data.push({
        // BUG: Fix this type annotation, somehow those Dates don't work
        x: pointer.minus({ days: 1 }).toJSDate() as unknown as number,
        y: weekCount
      })
    }

    // Finally, after the outer while, push the now complete dataset.
    datasets.push(year)
  }

  return { labels, datasets }
})

const months = computed<ChartData>(() => {
  // Months are calculated on a day-basis per year.
  const datasets = []
  const labels: any[] = []

  for (let i = earliestMonth.value; i <= latestMonth.value; i++) {
    let pointer = DateTime.local(currentYear.value, i, 1)
    const end = pointer.endOf('month')

    // Each dataset needs to conform to Chart.js's config
    // TODO: Better algorithm for the colours
    const randR = Math.random() * 255
    const randG = Math.random() * 255
    const randB = Math.random() * 255
    const month: ChartDataset = {
      label: pointer.toLocaleString({ month: 'long' }),
      pointRadius: 0,
      borderColor: `rgba(${randR}, ${randG}, ${randB}, 0.7)`,
      backgroundColor: `rgba(${randR}, ${randG}, ${randB}, 0.7)`, // Necessary for tooltips
      pointHoverBorderColor: `rgba(${randR}, ${randG}, ${randB}, 1.0)`,
      pointHoverBackgroundColor: `rgba(${randR}, ${randG}, ${randB}, 1.0)`,
      tension: 0.0,
      fill: false,
      data: []
    }

    while (pointer.diff(end, 'days').days <= 0) {
      let dayCount = statisticsStore.stats.wordCount[pointer.toFormat('yyyy-MM-dd')]
      if (dayCount === undefined) {
        dayCount = 0
      }

      const dayLabel = `Day ${pointer.day}`
      if (!labels.includes(dayLabel)) {
        // Prevent pushing this label multiple times
        labels.push(dayLabel)
      }

      month.data.push({
        // BUG: Fix this type annotation, somehow those Dates don't work
        x: pointer.toJSDate() as unknown as number,
        y: dayCount
      })
      // Progress one day.
      pointer = pointer.plus({ days: 1 })
    }

    datasets.push(month)
  }

  return { labels, datasets }
})

const currentData = computed<ChartData>(() => {
  // Just returns the data necessary for the chart library that can then
  // be plugged into it.
  return (unit.value === 'year') ? years.value : months.value
})

watch(currentData, () => {
  if (chart !== null) {
    chart.data = currentData.value
    chart.update()
  }
})

onMounted(() => {
  createChart(currentData.value)
})

onBeforeUnmount(() => {
  if (chart !== null) {
    chart.destroy()
    chart = null
  }
})

function createChart (initialData: ChartData): void {
  if (chart !== null || chartCanvas.value === null) {
    return // Not gonna recreate the chart, we only need one thing.
  }

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: initialData,
    options: {
      // Scales configuration
      scales: {
        y: {
          title: {
            text: 'Words',
            display: true
          },
          // DEBUG: Type incompatible, so apparently something changed
          // gridLines: {
          //   display: true, // Whether to display them at all
          //   drawOnChartArea: true, // Gridlines on the chart
          //   drawTicks: true // Gridlines off the charts, so to speak
          // },
          ticks: {
            display: true // ,
            // beginAtZero: false
          }
        },
        x: {
          title: {
            text: 'Time',
            display: true
          },
          // DEBUG: Type incompatible, so apparently something changed
          // gridLines: {
          //   display: true, // Whether to display them at all
          //   drawOnChartArea: false, // Gridlines on the chart
          //   drawTicks: true // Gridlines off the charts, so to speak
          // },
          ticks: {
            display: true
          }
        }
      },
      // Generic options we need every time
      responsive: true,
      // Tooltips should be fastly visible
      plugins: {
        tooltip: {
          mode: 'index',
          intersect: false
        } // ,
        // DEBUG: Type incompatible, so apparently something changed
        // hover: {
        //   mode: 'index',
        //   intersect: false
        // }
      }
    }
  }) // END chart instantiation
}

function prevYear (): void {
  // Decrease the unit by one if possible
  if (currentYear.value > earliestYear.value) {
    currentYear.value -= 1
  }
}

function nextYear (): void {
  // Increase by one, if possible
  if (currentYear.value < latestYear.value) {
    currentYear.value += 1
  }
}
</script>

<style lang="less">
body div#chart-container {
  padding: 10px;
}

body div#chart-container div#chart-canvas-container {
  position: relative;
  width: 100dvw;
  height: 100dvh;
}
</style>
