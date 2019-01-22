const ZettlrDialog = require('./zettlr-dialog.js')
const Chart = require('chart.js')
const { localiseNumber } = require('../../common/zettlr-helpers.js')
const { trans } = require('../../common/lang/i18n.js')

class StatsDialog extends ZettlrDialog {
  constructor () {
    super()
    this._statsData = []
    this._statsLabels = []
    this._dialog = 'statistics'
  }

  preInit (data = null) {
    if (!data) throw new Error('No statistical data provided')

    // Prepare the statistical data
    for (let key in data) {
      this._statsLabels.push(key)
      this._statsData.push(data[key])
    }

    return data
  }

  postAct () {
    let config = {
      type: 'line',
      data: {
        labels: this._statsLabels,
        datasets: [{
          label: trans('dialog.statistics.words'),
          backgroundColor: 'rgba( 28, 178, 126, 1)',
          borderColor: 'rgba( 28, 178, 126, 1)',
          data: this._statsData,
          fill: false
        }]
      },
      options: {
        elements: { line: { tension: 0 } },
        responsive: true,
        title: { display: true, text: trans('dialog.statistics.words_per_day') },
        tooltips: {
          mode: 'index',
          intersect: false,
          callbacks: {
            title: (item, data) => {
              // Format the date which is used as the title nicely. Currently
              // only the German date format. TODO: Localise dates!
              // (P.S.: I have no idea why here the item is an array, but in
              // the next callback it is not. It's in the docs, unexplained.)
              return item[0].xLabel.split('-').reverse().join('.')
            },
            label: (item, data) => {
              // Localise the individual word counts
              let label = data.datasets[item.datasetIndex].label || ''
              if (label) label += ': '
              label += localiseNumber(item.yLabel)
              return label
            }
          }
        },
        hover: { mode: 'nearest', intersect: true },
        scales: {
          xAxes: [{
            type: 'time', // Indicate to the library that the labels are actually dates.
            distribution: 'linear',
            time: { unit: 'day' },
            display: true,
            scaleLabel: {
              display: true,
              labelString: trans('dialog.statistics.day')
            },
            ticks: {
              source: 'auto' // i.e. ticks should be automatically computed
            }
          }],
          yAxes: [{
            display: true,
            scaleLabel: {
              display: true,
              labelString: trans('dialog.statistics.words')
            },
            ticks: {
              // Localise the word counts on the y-axis
              callback: (val, i, vals) => { return localiseNumber(val) }
            }
          }]
        },
        onResize: () => { this._place() }
      }
    }
    this._chart = new Chart(document.getElementById('canvas').getContext('2d'), config)
  }
}

module.exports = StatsDialog
