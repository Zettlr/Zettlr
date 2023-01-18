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
    <canvas
      id="main-chart"
      ref="chart"
      width="400"
      height="250"
      aria-label="Main Chart Display"
      role="img"
    ></canvas>
  </div>
</template>

<script lang="ts">
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
  ChartData,
  ChartDataset,
  CategoryScale,
  LinearScale,
  LineController,
  PointElement,
  LineElement,
  ChartConfiguration
} from 'chart.js'
import SelectControl from '@common/vue/form/elements/Select.vue'
import ButtonControl from '@common/vue/form/elements/Button.vue'
import { defineComponent, PropType } from 'vue'

// Register the components of Chart.js which we need
Chart.register(CategoryScale, LinearScale, LineController, PointElement, LineElement)

let chart: Chart|null = null

export default defineComponent({
  name: 'ChartView',
  components: {
    SelectControl,
    ButtonControl
  },
  props: {
    wordCounts: {
      type: Object as PropType<{ [key: string]: number }>,
      required: true
    }
  },
  data: function () {
    return {
      now: DateTime.local(),
      currentYear: DateTime.local().year,
      currentMonth: DateTime.local().month,
      unit: 'month' // Possible display unit
    }
  },
  computed: {
    chartLabel: function (): string {
      return trans('Charts')
    },
    earliestYear: function (): number {
      const years = Object.keys(this.wordCounts).map(k => parseInt(k.substr(0, 4), 10))
      let min = +Infinity
      for (const year of years) {
        if (min > year) {
          min = year
        }
      }

      return min
    },
    latestYear: function (): number {
      const years = Object.keys(this.wordCounts).map(k => parseInt(k.substr(0, 4), 10))
      let max = -Infinity
      for (const year of years) {
        if (max < year) {
          max = year
        }
      }

      return max
    },
    earliestMonth: function (): number {
      // Returns the earliest month given the current _year_
      const months = Object.keys(this.wordCounts).filter(k => {
        const year = parseInt(k.substr(0, 4), 10)
        return year === this.currentYear
      }).map(k => {
        return parseInt(k.substr(5, 2), 10)
      })

      let min = +Infinity
      for (const month of months) {
        if (min > month) {
          min = month
        }
      }
      return min
    },
    latestMonth: function (): number {
      const months = Object.keys(this.wordCounts).filter(k => {
        const year = parseInt(k.substr(0, 4), 10)
        return year === this.currentYear
      }).map(k => {
        return parseInt(k.substr(5, 2), 10)
      })

      let max = -Infinity
      for (const month of months) {
        if (max < month) {
          max = month
        }
      }
      return max
    },
    /**
     * Returns year datasets
     *
     * @return  {Array}  An array for year-datasets
     */
    years: function (): ChartData {
      // Years are computed on a week-wise basis
      const datasets: ChartDataset[] = []
      const labels: string[] = []

      for (let i = this.earliestYear; i <= this.latestYear; i++) {
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
            const dayCount = this.wordCounts[pointer.toFormat('yyyy-MM-dd')]
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
    },
    months: function (): ChartData {
      // Months are calculated on a day-basis per year.
      const datasets = []
      const labels: any[] = []

      for (let i = this.earliestMonth; i <= this.latestMonth; i++) {
        let pointer = DateTime.local(this.currentYear, i, 1)
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
          let dayCount = this.wordCounts[pointer.toFormat('yyyy-MM-dd')]
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
    },
    currentData: function (): ChartData {
      // Just returns the data necessary for the chart library that can then
      // be plugged into it.
      return (this.unit === 'year') ? this.years : this.months
    }
  },
  watch: {
    currentData: function () {
      if (chart !== null) {
        chart.data = this.currentData
        chart.update()
      }
    }
  },
  mounted: function () {
    this.createChart(this.currentData)
  },
  beforeUnmount: function () {
    if (chart !== null) {
      chart.destroy()
      chart = null
    }
  },
  methods: {
    createChart: function (initialData: ChartData) {
      if (chart !== null) {
        return // Not gonna recreate the chart, we only need one thing.
      }

      chart = new Chart(this.$refs.chart as HTMLCanvasElement, {
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
              gridLines: {
                display: true, // Whether to display them at all
                drawOnChartArea: true, // Gridlines on the chart
                drawTicks: true // Gridlines off the charts, so to speak
              },
              ticks: {
                display: true,
                beginAtZero: false
              }
            },
            x: {
              title: {
                text: 'Time',
                display: true
              },
              gridLines: {
                display: true, // Whether to display them at all
                drawOnChartArea: false, // Gridlines on the chart
                drawTicks: true // Gridlines off the charts, so to speak
              },
              ticks: {
                display: true
              }
            }
          },
          // Generic options we need every time
          responsive: true,
          maintainAspectRatio: true,
          // Tooltips should be fastly visible
          plugins: {
            tooltip: {
              mode: 'index',
              intersect: false
            },
            hover: {
              mode: 'index',
              intersect: false
            }
          }
        }
      } as ChartConfiguration) // END chart instantiation
    },
    prevYear: function (): void {
      // Decrease the unit by one if possible
      if (this.currentYear > this.earliestYear) {
        this.currentYear -= 1
      }
    },
    nextYear: function (): void {
      // Increase by one, if possible
      if (this.currentYear < this.latestYear) {
        this.currentYear += 1
      }
    }
  }
})
</script>

<style lang="less">
body div#chart-container {
  padding: 10px;
}
</style>
