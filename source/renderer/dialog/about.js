/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AboutDialog class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This dialog shows the about window, displaying all packages
 *                  used by Zettlr, the license and additional info.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')
const { trans } = require('../../common/lang/i18n')
const formatDate = require('../../common/util/format-date')

/**
 * Rounds an integer to the specified amount of floating points.
 *
 * @param {number} num The number to be rounded.
 * @param {number} amount The number of floating point digits to retain.
 * @returns {number}
 */
function roundDec (num, amount) {
  let exp = Math.pow(10, amount)
  return Math.round(num * exp) / exp
}

class AboutDialog extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'about'
  }

  preInit (data) {
    process.getCPUUsage() // First call returns null, so we have to call it twice
    data.version = global.config.get('version')
    data.uuid = global.config.get('uuid')

    // Debug info: Versions, argv, env, and overall process uptime
    data.versions = JSON.parse(JSON.stringify(process.versions))
    data.argv = JSON.parse(JSON.stringify(process.argv))
    data.env = []
    for (let key of Object.keys(process.env)) {
      data.env.push({
        'key': key,
        'value': process.env[key]
      })
    }
    data.uptime = Math.floor(process.uptime()) // In seconds

    // System info: arch, platform, and version
    data.architecture = process.arch
    data.platform = process.platform
    data.platformVersion = process.getSystemVersion()

    // Realtime stats
    let mem = process.memoryUsage() // rss, heapTotal, heapUsed, external, all in bytes
    data.memory = {
      // Here we are converting all from bytes to megabytes
      'rss': roundDec(mem.rss / 1000000, 2), // Resident Set Size
      'external': roundDec(mem.external / 1000000, 2) // C++ objects bound to their JavaScript pendants
    }

    data.cpu = roundDec(process.getCPUUsage().percentCPUUsage, 2)

    let heap = process.getHeapStatistics()
    data.heap = {
      // Convert all from KB to MB
      'total': roundDec(heap.totalHeapSize / 1000, 2),
      'used': roundDec(heap.usedHeapSize / 1000, 2),
      'limit': roundDec(heap.heapSizeLimit / 1000, 2)
    }

    return data
  }

  /**
   * A polling function that updates the system load info in real time.
   */
  _realtimeUpdatePoll () {
    let memoryInfo = process.memoryUsage()
    let heapInfo = process.getHeapStatistics()
    let realtimeCPU = roundDec(process.getCPUUsage().percentCPUUsage, 2)
    let realtimeRSS = roundDec(memoryInfo.rss / 1000000, 2)
    let realtimeExternal = roundDec(memoryInfo.external / 1000000, 2)
    let realtimeHeapUsed = roundDec(heapInfo.usedHeapSize / 1000, 2)
    let realtimeHeapTotal = roundDec(heapInfo.totalHeapSize / 1000, 2)

    let rtCPUElem = document.getElementById('realtime-cpu-load')
    let rtRSSElem = document.getElementById('realtime-rss')
    let rtExtElem = document.getElementById('realtime-external')
    let rtHpUElem = document.getElementById('realtime-heap-used')
    let rtHpTElem = document.getElementById('realtime-heap-total')

    // If any of these elements is missing, this indicates that the dialog has
    // been closed, so neither do we need to update, nor start a timeout.
    if (!rtCPUElem || !rtRSSElem || !rtExtElem || !rtHpUElem || !rtHpTElem) return

    rtCPUElem.innerText = realtimeCPU
    rtRSSElem.innerText = realtimeRSS
    rtExtElem.innerText = realtimeExternal
    rtHpUElem.innerText = realtimeHeapUsed
    rtHpTElem.innerText = realtimeHeapTotal

    // This timeout will only be fired when the dialog is still open
    setTimeout(this._realtimeUpdatePoll.bind(this), 1000)
  }

  postAct () {
    // Retrieve additional data from main
    global.ipc.send('get-translation-metadata', {}, (data) => {
      // List all contributors to translations
      let html = ''
      for (let lang of data) {
        let failsafe = 'dialog.preferences.app_lang.' + lang.bcp47
        let name = trans(failsafe)
        if (name === failsafe) name = lang.bcp47
        html += `<h3>${name} <small>last updated ${formatDate(new Date(lang.updated_at))}</small></h3>`
        html += '<ul>'
        for (let author of lang.authors) html += `<li>${author.replace(/<(.+)>/g, '<small>(<a href="mailto:$1">$1</a>)</small>')}</li>`
        html += '</ul>'
      }
      document.getElementById('contrib').innerHTML = html
    })

    global.ipc.send('get-sponsors')
    // Don't want the above-hack again. Let's simply listen for a different command.
    global.ipc.once('sponsors-list', (data) => {
      // List all sponsors, optionally with link
      let html = '<ul>'
      for (let sponsor of data) {
        html += `<li>${sponsor.name}`
        if (sponsor.link) {
          html += `(<a onclick="require('electron').shell.openExternal('${sponsor.link}')">${sponsor.link}</a>)`
        }
        html += '</li>'
      }
      html += '</ul>'
      document.getElementById('sponsorList').innerHTML = html
    })

    // Enable real time statistics for the debug panel
    this._realtimeUpdatePoll()
  }
}

module.exports = AboutDialog
