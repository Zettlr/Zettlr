<template>
  <div id="calendar-container">
    <h1>{{ calendarLabel }} {{ year }}</h1>
    <div>
      <ButtonControl
        v-bind:disabled="isMinimumYear"
        v-bind:icon="'angle'"
        v-bind:direction="'left'"
        v-bind:label="String(year - 1)"
        v-bind:inline="true"
        v-on:click="yearMinus()"
      >
      </ButtonControl>
      <ButtonControl
        v-bind:disabled="isCurrentYear"
        v-bind:icon="'angle'"
        v-bind:direction="'right'"
        v-bind:label="String(year + 1)"
        v-bind:inline="true"
        v-on:click="yearPlus()"
      >
      </ButtonControl>
    </div>

    <div id="calendar-legend">
      <span class="label">
        {{ localiseNumber(distributiveStatistics.min) }}
      </span>
      <div style="display: flex;">
        <span class="box percentile-00"></span>
        <span class="box percentile-01"></span>
        <span class="box percentile-02"></span>
        <span class="box percentile-03"></span>
        <span class="box percentile-04"></span>
        <span class="box percentile-05"></span>
        <span class="box percentile-06"></span>
        <span class="box percentile-07"></span>
        <span class="box percentile-08"></span>
        <span class="box percentile-09"></span>
        <span class="box percentile-10"></span>
      </div>
      <span class="label">
        {{ localiseNumber(distributiveStatistics.max) }}
      </span>
    </div>

    <!--
      We will display the calendar in three quartiles:
      JAN FEB MAR APR
      MAY JUN JUL AUG
      SEP OCT NOV DEC
    -->
    <div id="calendar">
      <div
        v-for="(month, monthIndex) in months"
        v-bind:key="month.name"
        class="month"
      >
        <h2>{{ month.name }}</h2>
        <div class="day-grid">
          <div
            v-for="num in month.padding"
            v-bind:key="num - 7"
            class="weekday"
          >
          </div>
          <!-- Afterwards, output all days. Everything will be aligned perfectly due to the grid -->
          <div
            v-for="(day, key) of month.daysInMonth"
            v-bind:key="key"
            v-bind:class="{
              'weekday': true,
              [activityPercentileClass(year, monthIndex + 1, day)]: true
            }"
            v-bind:title="getLocalizedWordCount(year, monthIndex + 1, day)"
            v-on:mouseenter="showTippy"
          >
            {{ day }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CalendarView
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the calendar with the word counts.
 *
 * END HEADER
 */

import { DateTime } from 'luxon'
import { trans } from '@common/i18n-renderer'
import ButtonControl from '@common/vue/form/elements/ButtonControl.vue'
import { ref, computed } from 'vue'
import localiseNumber from '@common/util/localise-number'
import { useStatisticsStore } from '../pinia/statistics-store'
import tippy from 'tippy.js'

const statisticsStore = useStatisticsStore()

// STATIC VARIABLES
const calendarLabel = trans('Calendar')
const MONTHS = [
  trans('January'), trans('February'), trans('March'), trans('April'),
  trans('May'), trans('June'), trans('July'), trans('August'),
  trans('September'), trans('October'), trans('November'), trans('December')
]

// The calendar will show it year-wise. We save this variable in order to do
// some fancy stuff around sylvester. The thing is, people (like me) will want
// to test this out: if on Dec. 31st they remember "Oh wait, this one app had
// such a calendar view for the current year!" they will open this friggin
// window and sit in front of their computer until the clock hits 00:00, and
// then they'll expect the window to update automatically. This way we can
// ensure it will. Am I crazy for respecting such a weird edge case? Very
// likely. Does it cost me too much time to code? Luckily not, given the way Vue
// works.
const now = ref<DateTime>(DateTime.local())

const year = computed<number>(() => now.value.year)
const isCurrentYear = computed<boolean>(() => DateTime.local().year === now.value.year)
const isMinimumYear = computed<boolean>(() => {
  // Returns true if `now` holds the minimum year for which there is data
  const minYear = Math.min(
    ...Object
      .keys(statisticsStore.stats.wordCount)
      .map(k => parseInt(k.substring(0, 4), 10))
  )
  return now.value.year === minYear
})

const months = computed<Array<{ name: string, padding: number, daysInMonth: number }>>(() => {
  const ret: Array<{ name: string, padding: number, daysInMonth: number }> = []

  for (let i = 1; i <= 12; i++) {
    const month = now.value.set({ month: i })
    const beginning = month.startOf('month')
    ret.push({
      name: MONTHS[i - 1],
      padding: beginning.weekday - 1,
      daysInMonth: month.daysInMonth ?? 0
    })
  }

  return ret
})

const distributiveStatistics = computed(() => {
  let max = 0
  let min = Infinity
  const yearStr = String(year.value)
  // For the calendar view, we only consider the current year
  const entries = Object.entries(statisticsStore.stats.wordCount)
    .filter(([ date, count ]) => {
      return date.startsWith(yearStr)
    })
  const count = entries.length
  const sum = entries.reduce((prev, [ date, words ]) => {
    if (words > max) {
      max = words
    }
    if (words < min) {
      min = words
    }

    return prev + words
  }, 0)

  return {
    sum, mean: sum / count,
    min, max,
    maxLog: Math.log(max),
    count }
})

function activityPercentileClass (year: number, month: number, date: number): string {
  const parsedMonth = String(month).padStart(2, '0')
  const parsedDate = String(date).padStart(2, '0')
  const wordCount = statisticsStore.stats.wordCount[`${year}-${parsedMonth}-${parsedDate}`] ?? 0

  // Edge cases
  if (wordCount === 0) {
    return 'no-activity'
  } else if (wordCount === distributiveStatistics.value.max) {
    return 'percentile-10'
  }

  // Statistics 101: We are logging the percentiles. This way, we can smooth out
  // the distribution, especially if there are only a few strong outliers. This
  // ensures that we make use of more of the available classes.
  const percentile = Math.floor(Math.log(wordCount) / distributiveStatistics.value.maxLog * 10)
  return `percentile-0${percentile}` // ranges from 00 to 09
}

function getLocalizedWordCount (year: number, month: number, date: number): string {
  const parsedMonth = String(month).padStart(2, '0')
  const parsedDate = String(date).padStart(2, '0')
  const wordCount = statisticsStore.stats.wordCount[`${year}-${parsedMonth}-${parsedDate}`]

  return wordCount !== undefined ? localiseNumber(wordCount) : '0'
}

function yearMinus (): void {
  now.value = now.value.minus({ years: 1 })
}

function yearPlus (): void {
  // Prevent going into the future
  if (isCurrentYear.value) {
    return
  }

  now.value = now.value.plus({ years: 1 })
}

function showTippy (event: MouseEvent) {
  if (event.target === null || !(event.target instanceof HTMLElement)) {
    return
  }

  const content = event.target.getAttribute('title')
  if (content === null) {
    return
  }

  const instance = tippy(event.target, { content, onHidden:  (i) => i.destroy() })
  instance.show()
}

</script>

<style lang="less">
// Sequential color gradient
// @color-00: #0ca70f9e;
// @color-01: #51c744aa;
// @color-02: #74f84baa;
// @color-03: #97f749aa;
// @color-04: #c3f749aa;
// @color-05: #ebf749aa;
// @color-06: #f8e114aa;
// @color-07: #fca625aa;

// Blue->Orange heatmap gradient
@color-00: #00eeff;
@color-01: #00b7ff;
@color-02: #488eff;
@color-03: #8867ff;
@color-04: #b458ff;
@color-05: #cb3bff;
@color-06: #ec00b4;
@color-07: #f02230;
@color-08: #ff6645;
@color-09: #ff9e00;
@color-10: #ffcc00;

body div#calendar-container {
  padding: 10px; // Shift the contents a little bit from the edges

  div#calendar, div#calendar-legend {
  .percentile-00 { background-color: @color-00; }
  .percentile-01 { background-color: @color-01; }
  .percentile-02 { background-color: @color-02; }
  .percentile-03 { background-color: @color-03; }
  .percentile-04 { background-color: @color-04; }
  .percentile-05 { background-color: @color-05; }
  .percentile-06 { background-color: @color-06; }
  .percentile-07 { background-color: @color-07; }
  .percentile-08 { background-color: @color-08; }
  .percentile-09 { background-color: @color-09; }
  .percentile-10 { background-color: @color-10; }
}

  div#calendar {
    margin-top: 20px;
    width: calc(100vw - 20px);
    overflow: auto;
    display: grid;
    // We have four month per quartile ...
    grid-template-columns: repeat(4, auto);
    // ... and three quartiles per year.
    grid-template-rows: repeat(3, auto);
    grid-gap: auto;

    div.month {
      h2 {
        font-size: 20px;
        line-height: 20px;
        margin: 0;
        padding: 0;
      }
    }

    div.day-grid {
      display: inline-grid;
      padding: 10px;
      gap: 2px; // A little bit of a gap between the days
      /* We have seven days ... */
      grid-template-columns: repeat(7, 25px);
      /* ... and at most 6 partial weeks */
      grid-template-rows: repeat(6, 20px);

      div.weekday {
        position: relative;
        width: 25px;
        height: 20px;
        text-align: center;
        line-height: 20px;
        font-size: 10px;
        border-radius: 4px;

        // Fade these days a little bit
        &.no-activity {
          opacity: 0.5;
        }
      }
    }
  }

  div#calendar-legend {
    margin: 10px 0;
    display: inline-flex;
    padding: 5px;
    border: 1px solid #aaa;
    border-radius: 4px;
    align-items: center;
    gap: 10px;
    font-size: 80%;
    font-weight: bold;

    span.box {
      display: inline-block;
      width: 16px;
      height: 16px;

      &:first-child {
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
      }

      &:last-child {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
      }
    }
  }
}
</style>
