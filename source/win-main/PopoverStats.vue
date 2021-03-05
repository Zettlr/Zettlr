<template>
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
    <button v-on:click="buttonClick">
      {{ buttonLabel }}
    </button>
  </div>
</template>

<script>
import { trans } from '../common/i18n'
import localiseNumber from '../common/util/localise-number'

export default {
  name: 'PopoverExport',
  components: {
  },
  data: function () {
    return {
      sumMonth: 0,
      averageMonth: 0,
      sumToday: 0,
      showMoreStats: false
    }
  },
  computed: {
    popoverData: function () {
      return {
        showMoreStats: this.showMoreStats
      }
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
      return trans('gui.words_last_month')
    },
    averageLabel: function () {
      return trans('gui.avg_words')
    },
    todayLabel: function () {
      return trans('gui.today_words')
    },
    surpassedMessage: function () {
      return trans('gui.avg_surpassed')
    },
    closeToMessage: function () {
      return trans('gui.avg_close_to')
    },
    notReachedMessage: function () {
      return trans('gui.avg_not_reached')
    },
    buttonLabel: function () {
      return trans('gui.statistics_more')
    }
  },
  methods: {
    buttonClick: function () {
      this.showMoreStats = true
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
}
</style>
