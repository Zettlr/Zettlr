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
              'no-activity': getActivityScore(year, monthIndex + 1, day) === -1,
              'low-activity': getActivityScore(year, monthIndex + 1, day) === 0,
              'low-mid-activity': getActivityScore(year, monthIndex + 1, day) === 1,
              'high-mid-activity': getActivityScore(year, monthIndex + 1, day) === 2,
              'high-activity': getActivityScore(year, monthIndex + 1, day) === 3
            }"
            v-bind:title="getLocalizedWordCount(year, monthIndex + 1, day)"
          >
            {{ day }}
          </div>
        </div>
      </div>
    </div>
    <div id="calendar-legend">
      <span class="low-mid-activity">{{ lowMidLegend }}</span><br>
      <span class="high-mid-activity">{{ highMidLegend }}</span><br>
      <span class="high-activity">{{ highLegend }}</span>
    </div>
  </div>
</template>

<script lang="ts">
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
import ButtonControl from '@common/vue/form/elements/Button.vue'
import { defineComponent, PropType } from 'vue'
import localiseNumber from '@common/util/localise-number'

export default defineComponent({
  name: 'CalendarView',
  components: {
    ButtonControl
  },
  props: {
    wordCounts: {
      type: Object as PropType<{ [key: string]: number }>,
      required: true
    },
    monthlyAverage: {
      type: Number,
      required: true
    }
  },
  data: function () {
    return {
      // The calendar will show it year-wise. We save this variable in order to
      // do some fancy stuff around sylvester. The thing is, people (like me)
      // will want to test this out: if on Dec. 31st they remember "Oh wait,
      // this one app had such a calendar view for the current year!" they will
      // open this friggin window and sit in front of their computer until the
      // clock hits 00:00, and then they'll expect the window to update
      // automatically. This way we can ensure it will.
      // Am I crazy for respecting such a weird edge case? Very likely. Does it
      // cost me too much time to code? Luckily not, given the way Vue works.
      now: DateTime.local()
    }
  },
  computed: {
    year: function (): number {
      return this.now.year
    },
    isCurrentYear: function (): boolean {
      return this.now.year === DateTime.local().year
    },
    calendarLabel: function (): string {
      return trans('Calendar')
    },
    isMinimumYear: function (): boolean {
      // Returns true if this.now holds the minimum year for which there is
      // data available
      const years = Object.keys(this.wordCounts).map(k => parseInt(k.substr(0, 4), 10))
      let min = +Infinity
      for (const year of years) {
        if (min > year) {
          min = year
        }
      }

      return this.now.year === min
    },
    months: function (): Array<{ name: string, padding: number, daysInMonth: number }> {
      const ret = []
      const MONTHS = [
        trans('January'),
        trans('February'),
        trans('March'),
        trans('April'),
        trans('May'),
        trans('June'),
        trans('July'),
        trans('August'),
        trans('September'),
        trans('October'),
        trans('November'),
        trans('December')
      ]

      for (let i = 1; i <= 12; i++) {
        const month = this.now.set({ month: i })
        const beginning = month.startOf('month')
        ret.push({
          name: MONTHS[i - 1],
          padding: beginning.weekday - 1,
          daysInMonth: month.daysInMonth
        })
      }

      return ret
    },
    lowMidLegend: function (): string {
      return trans('Below the monthly average')
    },
    highMidLegend: function (): string {
      return trans('Over the monthly average')
    },
    highLegend: function (): string {
      return trans('More than twice the monthly average')
    }
  },
  methods: {
    /**
     * Returns an activity percentage for the given day from 0 to 1
     *
     * @param   {number}  year   The year to retrieve
     * @param   {number}  month  The month to retrieve
     * @param   {number}  date   The day to retrieve
     *
     * @return  {number}         The percentage from 0 to 1
     */
    getActivityScore: function (year: number, month: number, date: number): number {
      let parsedMonth = String(month)
      let parsedDate = String(date)

      if (parsedMonth.length < 2) {
        parsedMonth = `0${month}`
      }

      if (parsedDate.length < 2) {
        parsedDate = `0${date}`
      }

      const wordCount = this.wordCounts[`${year}-${parsedMonth}-${parsedDate}`]

      if (wordCount === undefined || wordCount === 0) {
        return -1
      } else if (wordCount < this.monthlyAverage / 2) {
        return 0
      } else if (wordCount < this.monthlyAverage) {
        return 1
      } else if (wordCount < this.monthlyAverage * 2) {
        return 2 // Less than twice the monthly average
      } else {
        return 3 // More than twice the monthly average
      }
    },
    getLocalizedWordCount: function (year: number, month: number, date: number): string {
      let parsedMonth = String(month)
      let parsedDate = String(date)

      if (parsedMonth.length < 2) {
        parsedMonth = `0${month}`
      }

      if (parsedDate.length < 2) {
        parsedDate = `0${date}`
      }

      const wordCount = this.wordCounts[`${year}-${parsedMonth}-${parsedDate}`]
      return localiseNumber(wordCount || 0)
    },
    yearMinus: function (): void {
      this.now = this.now.minus({ years: 1 })
    },
    yearPlus: function (): void {
      // Prevent going into the future
      if (this.now.year === DateTime.local().year) {
        return
      }

      this.now = this.now.plus({ years: 1 })
    }
  }
})
</script>

<style lang="less">
@low-mid-bg: rgba(151, 170, 255, 0.6);
@low-mid-fg: rgb(8, 5, 167);
@high-mid-bg: rgba(192, 60, 152, 0.6);
@high-mid-fg: rgb(77, 2, 60);
@high-bg: rgba(214, 54, 54, 0.6);
@high-fg: rgb(87, 0, 0);

body div#calendar-container {
  padding: 10px; // Shift the contents a little bit from the edges

  div#calendar {
    margin-top: 20px;
    display: inline-grid;
    // We have four month per quartile ...
    grid-template-columns: repeat(4, 195px); // 10px padding left and right
    // ... and three quartiles per year.
    grid-template-rows: repeat(3, 160px); // 10px padding top and bottom + 20px heading-size

    div.month h2 {
      font-size: 20px;
      line-height: 20px;
      margin: 0;
      padding: 0;
    }

    div.day-grid {
      display: inline-grid;
      padding: 10px;
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

        // Fade these days a little bit
        &.no-activity {
          opacity: 0.5;
        }
        &.low-mid-activity {
          // Slightly blue-ish
          background-color: @low-mid-bg;
          color: @low-mid-fg;
        }
        &.high-mid-activity {
          // Slightly purple
          background-color: @high-mid-bg;
          color: @high-mid-fg;
        }
        &.high-activity {
          // Reddish
          background-color: @high-bg;
          color: @high-fg;
        }
      }
    }
  }

  div#calendar-legend {

    span {
      display: inline-block;
      font-size: 12px;
      padding: 6px;
      margin: 6px 0;
      border-radius: 6px;

      &.low-mid-activity {
        background-color: @low-mid-bg;
        color: @low-mid-fg;
      }
      &.high-mid-activity {
        background-color: @high-mid-bg;
        color: @high-mid-fg;
      }
      &.high-activity {
        background-color: @high-bg;
        color: @high-fg;
      }
    }
  }
}
</style>
