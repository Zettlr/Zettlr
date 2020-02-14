/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        StatsDialog class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This dialog controls the powerful statistical dialog with
 *                  the Chart.js chart.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')
const Chart = require('chart.js')
const localiseNumber = require('../../common/util/localise-number')
const formatDate = require('../../common/util/format-date')
const { trans } = require('../../common/lang/i18n.js')
const moment = require('moment')

class StatsDialog extends ZettlrDialog {
  /**
   * This class is used to display the writing statistics in a dialog. It is
   * able to do a lot of data variation using chart.js
   */
  constructor () {
    super()
    this._backgroundData = [] // Holds the dataset by weeks, months or years
    this._rawData = null
    this._dialog = 'statistics'
    this._mode = 'week' // What mode to use. Can be "week", "month" or "year"
    this._currentSheet = 0 // What week/month/year-sheet of data is displayed.
    this._compare = false // Indicates whether the previous time frame should also be displayed
  }

  /**
   * Before the dialog itself is initialised, we need to process the given data.
   * @param  {Object} [data=null] The wordCount property of the stats object.
   * @return {Object}             The modified data object.
   */
  preInit (data = null) {
    if (!data) throw new Error('No statistical data provided')

    this._rawData = JSON.parse(JSON.stringify(data)) // Save the raw word counts into this object
    this._sanitiseData() // Fill in holes in the data.
    this._prepareData() // By default start with weeks
    data.days = Object.keys(this._rawData).length
    let date = Object.keys(this._rawData)[0].split('-').map(e => parseInt(e))
    date = new Date(date[0], date[1] - 1, date[2]) // Remember months need to be 0-based
    date = formatDate(date)
    data.firstDay = date

    return data
  }

  /**
   * After the dialog itself has been activated, we need to activate our core
   * peace: the chart.
   * @return {void} Does not return.
   */
  postAct () {
    let config = {
      type: 'line',
      data: {
        labels: [], // Preset with empty data, as we will call the update func immediately
        datasets: [{
          label: trans('dialog.statistics.this_frame'),
          backgroundColor: window.getComputedStyle(document.documentElement).getPropertyValue('--c-primary'),
          borderColor: window.getComputedStyle(document.documentElement).getPropertyValue('--c-primary'),
          data: [], // Preset with empty data, as we will call the update func immediately
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
              // Format the date which is used as the title nicely. We'll just
              // use moment.js, because it's indeed great for this job.
              let title = ''
              if (this._mode === 'year') {
                title = trans('dialog.statistics.week') + ' ' + moment(item[0].xLabel).format('W/GGGG')
              } else {
                title = moment(item[0].xLabel).format('LL')
              }
              return title
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
            scaleLabel: { display: true },
            ticks: {
              min: 0, // Zero words is always the minimum on the y-axis
              // Localise the word counts on the y-axis
              callback: (val, i, vals) => { return localiseNumber(val) }
            }
          }]
        },
        onResize: () => { this._place() }
      }
    }

    // Finally initialise the Chart
    this._chart = new Chart(document.getElementById('canvas').getContext('2d'), config)

    // Immediately update with the first dataset
    this._updateChart()

    // Now we need to activate the previous/next buttons
    $('#prev-sheet').click((e) => {
      if (this._currentSheet > 0) {
        this._currentSheet--
        this._updateChart()
      }
    })

    // Next button
    $('#next-sheet').click((e) => {
      if (this._currentSheet < this._backgroundData.length - 1) {
        this._currentSheet++
        this._updateChart()
      }
    })

    // If the user wants to change the precision of the graph.
    $('#data-mode').change((e) => {
      this._mode = $(e.target).val()
      this._prepareData()
      this._updateChart()
    })

    // If the user wants to compare with the previous time frame.
    $('#data-compare').change((e) => {
      this._compare = !this._compare
      this._updateChart()
    })
  } // END post act

  /**
   * Sanitises the data in that it fills up holes in the wordCount object where
   * Zettlr hasn't been running and where there are no information. We'll preset
   * these days with 0.
   * @return {void} Modifies internal objects and does not return.
   */
  _sanitiseData () {
    // This function fills in missing dates and pre-set them with zeroes. They
    // should not go towards counting of the average word count (because of
    // demotivational issues), but they need to be present in the statistical
    // diagram, because otherwise it may lead to weird gaps.

    // Iterate over the keys (which are dates)
    for (let keys = Object.keys(this._rawData), i = 0, end = keys.length; i < end; i++) {
      // First retrieve the very first record of words and get the next day.
      let d = moment(keys[i])
      d.add(1, 'days')
      if (moment().diff(d, 'days') < 0) break
      while (this._rawData[d.format('YYYY-MM-DD')] === undefined) {
        this._rawData[d.format('YYYY-MM-DD')] = 0
        d.add(1, 'days')
        if (moment().diff(d, 'days') < 0) break
      }
      // Better be conservative with sanity checks
      if (moment().diff(d, 'days') < 0) break
    }

    // At this point, there shouldn't be any holes in the dataset anymore.
  }

  /**
   * Basically a switcher that prepares the _backgroundData array in the correct
   * way. It uses different functions for that.
   * @return {void} Does not return.
   */
  _prepareData () {
    switch (this._mode) {
      case 'week':
        this._weekify()
        break
      case 'month':
        this._monthlify()
        break
      case 'year':
        this._yearify()
        break
      default:
        this._mode = 'week'
        this.prepareData() // Try again
        break
    }
  }

  /**
   * Update the data and the chart with the requested sheet.
   * @return {void} Does not return.
   */
  _updateChart () {
    // Load the new labels. If compare mode is set to true, the bigger dataset
    // decides upon the amount of available labels.
    if (this._compare) {
      if (this._currentSheet > 0 &&
        Object.keys(this._backgroundData[this._currentSheet - 1].length > Object.keys(this._backgroundData[this._currentSheet]).length)) {
        // I have an issue with too long variable names ...
        this._chart.data.labels = Object.keys(this._backgroundData[this._currentSheet - 1])
      } else {
        this._chart.data.labels = Object.keys(this._backgroundData[this._currentSheet])
      }
    } else {
      this._chart.data.labels = Object.keys(this._backgroundData[this._currentSheet])
    }

    // Load the data sheets
    this._chart.data.datasets[0].data = Object.values(this._backgroundData[this._currentSheet])
    if (this._compare && this._currentSheet > 0) {
      this._chart.data.datasets[1] = {
        label: trans('dialog.statistics.previous_frame'),
        backgroundColor: window.getComputedStyle(document.documentElement).getPropertyValue('--c-secondary'),
        borderColor: window.getComputedStyle(document.documentElement).getPropertyValue('--c-secondary'),
        data: Object.values(this._backgroundData[this._currentSheet - 1]),
        fill: false
      }
    } else if (this._chart.data.datasets.length > 1) {
      this._chart.data.datasets.pop() // Remove the second dataset.
    }

    // Set the axis scale
    this._chart.options.scales.xAxes[0].time.unit = (this._mode === 'year') ? 'week' : 'day'

    if (this._compare) {
      // Reset the min/max in comparing mode, because otherwise the dates will
      // be fubar.
      this._chart.options.scales.xAxes[0].time.min = undefined
      this._chart.options.scales.xAxes[0].time.max = undefined
    } else {
      // Set the min/max to according values (beginning/end of week, month, or year)
      let min = moment(Object.keys(this._backgroundData[this._currentSheet])[0])
      let max = moment(Object.keys(this._backgroundData[this._currentSheet]).reverse()[0])
      if (this._mode === 'year') {
        let y = min.format('YYYY')
        min = `${y}-01-01`
        max = `${y}-12-31`
      } else if (this._mode === 'month') {
        min = min.date(1).format('YYYY-MM-DD')
        // date(0) will overflow the constructor and instead substract, see
        // https://github.com/moment/moment/issues/242#issuecomment-4862775
        max = max.add(1, 'months').date(0).format('YYYY-MM-DD')
      } else if (this._mode === 'week') {
        min = min.isoWeekday(1).format('YYYY-MM-DD')
        max = max.isoWeekday(7).format('YYYY-MM-DD')
      }

      this._chart.options.scales.xAxes[0].ticks.min = min
      this._chart.options.scales.xAxes[0].ticks.max = max
    }

    // Pre-set the progress bar
    $('#current-sheet-info').attr('max', this._backgroundData.length - 1)

    // Indicate the current sheet on the progress indicator
    $('#current-sheet-info').attr('value', this._currentSheet)

    // Update the chart's title
    this._chart.options.title.text = (this._mode === 'year') ? trans('dialog.statistics.words_per_week') : trans('dialog.statistics.words_per_day')

    // Update the chart itself.
    this._chart.update()
  }

  /**
   * Presets the background data for the graph by dividing it in weeks by seven
   * days.
   * @return {void} Does not return.
   */
  _weekify () {
    this._backgroundData = [] // Reset the data array
    // Now we have to iterate over all datapoints again and sort them into weeks.
    let week = Object.create(null)
    let start = moment(Object.keys(this._rawData)[0])
    let end = moment(Object.keys(this._rawData).reverse()[0])
    while (start.diff(end, 'days') < 0) {
      if (start.isoWeekday() === 1 && Object.keys(week).length > 0) {
        this._backgroundData.push(week)
        week = Object.create(null)
      }
      let d = start.format('YYYY-MM-DD')
      week[d] = this._rawData[d]
      start.add(1, 'days')
    }
    // Push the last remnants
    if (Object.keys(week).length > 0) this._backgroundData.push(week)

    // Now we are done. Set the iterators. The last week should be the start.
    this._currentSheet = this._backgroundData.length - 1
  }

  /**
   * Collects the writing statistics by month
   * @return {void} Does not return.
   */
  _monthlify () {
    this._backgroundData = [] // Reset the data array
    // Now we have to iterate over all datapoints again and sort them into months.
    let month = Object.create(null)
    let start = moment(Object.keys(this._rawData)[0])
    let end = moment(Object.keys(this._rawData).reverse()[0])
    while (start.diff(end, 'days') < 0) {
      if (start.date() === 1 && Object.keys(month).length > 0) {
        this._backgroundData.push(month)
        month = Object.create(null)
      }
      let d = start.format('YYYY-MM-DD')
      month[d] = this._rawData[d]
      start.add(1, 'days')
    }
    // Push the last remnants
    if (Object.keys(month).length > 0) this._backgroundData.push(month)

    // Now we are done. Set the iterators. The last month should be the start.
    this._currentSheet = this._backgroundData.length - 1
  }

  /**
   * Accumulates the given data by year, in week divisions.
   * @return {void} Does not return.
   */
  _yearify () {
    this._backgroundData = [] // Reset the data array
    // Now we have to iterate over all datapoints again and sort them into years.
    let year = Object.create(null)
    let week = 0 // Specifity of years: We don't use day-measure, but weeks.
    let start = moment(Object.keys(this._rawData)[0])
    let end = moment(Object.keys(this._rawData).reverse()[0])
    let currentYear = start.year()
    while (start.diff(end, 'days') < 0) {
      // Why use GGGG instead of YYYY? Because only GGGG pays attention for
      // outputting the correct year for the given *week*. YYYY is literally
      // the year on a day basis. Weeks can span years. For this, moment.js has
      // chosen GGGG for a year that is "week-aware."
      let d = start.format('GGGG-WW').split('-').join('W')
      if (start.year() > currentYear && Object.keys(year).length > 0) {
        year[d] = week
        this._backgroundData.push(year)
        currentYear = start.year()
        year = Object.create(null)
        week = 0
      } else if (start.isoWeekday() === 1) {
        year[d] = week
        week = 0
      }
      week += this._rawData[start.format('YYYY-MM-DD')]
      // Using the Week modifier. Yields 2019W12 - necessary to be parsable again
      start.add(1, 'days')
    }
    // Push the last remnants
    if (Object.keys(year).length > 0) this._backgroundData.push(year)
    // Now we are done. Set the iterators. The last year should be the start.
    this._currentSheet = this._backgroundData.length - 1
  }
}

module.exports = StatsDialog
