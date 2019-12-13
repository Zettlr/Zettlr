/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LogProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Handles application logging
 *
 * END HEADER
 */

const path = require('path')
const fs = require('fs').promises
const { app, BrowserWindow } = require('electron')
const hasProp = Object.prototype.hasOwnProperty

const LOG_LEVEL_VERBOSE = 1
const LOG_LEVEL_INFO = 2
const LOG_LEVEL_WARNING = 3
const LOG_LEVEL_ERROR = 4

class LogProvider {
  constructor () {
    this._logPath = path.join(app.getPath('userData'), 'logs')
    this._cleanLogs() // Remove all older logs
    // Initialise log with pre-boot messages and an initialisation message
    this._log = []
    this._entryPointer = 0 // Set the log entry file pointer to zero
    this._fileLock = false // True while data is being appended to the log
    this._migratePreBootLog()
    this.log(LOG_LEVEL_VERBOSE, 'Log provider booting up ...', null)

    // Inject the global provider functions
    global.log = {
      verbose: (msg, details = null) => { this.log(LOG_LEVEL_VERBOSE, msg, details) },
      info: (msg, details = null) => { this.log(LOG_LEVEL_INFO, msg, details) },
      warning: (msg, details = null) => { this.log(LOG_LEVEL_WARNING, msg, details) },
      error: (msg, details = null) => { this.log(LOG_LEVEL_ERROR, msg, details) },
      showLogViewer: () => { this.showLogViewer() }
    }
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  async shutdown () {
    this.log(LOG_LEVEL_VERBOSE, 'Log provider shutting down ...', null)
    await this._append() // One final append to flush the log
    return true
  }

  /**
   * Opens the log viewer window
   */
  showLogViewer () {
    if (this._win) {
      // Show the existing one instead opening a new one
      if (this._win.isMinimized()) this._win.restore()
      this._win.focus()
      return
    }
    this._win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: true
      }
    })
    this._win.once('ready-to-show', () => {
      this._win.show()
      setTimeout(() => {
        // Send all log entries at once
        this._win.webContents.send('log-view-reload', this._log)
      }, 1000)
    })
    this._win.on('closed', () => { this._win = null })

    // Load the renderer index
    let indexfile = path.resolve(__dirname, '../../log-viewer/index.htm')
    this._win.loadURL(`file://${indexfile}`)
  }

  /**
   * Logs one entry to the internal log.
   * @param {Number} logLevel The log level (defined atop of this file)
   * @param {String} message A short, human-readable error message
   * @param {Object} details Optional details (completely customisable)
   */
  log (logLevel, message, details) {
    if (!details) details = {} // No details -> empty object

    // Simply append to log
    let msg = {
      'level': logLevel,
      'message': message,
      'details': details,
      'time': this._getTimestamp()
    }

    this._log.push(msg)

    // Immediately append the log
    if (this._win) this._win.webContents.send('log-view-add', msg)
    this._append() // Returns a promise, but the function manages
    // it's own lock-flag
  }

  /**
   * Removes old logfiles so that at max there are 30 files present.
   */
  async _cleanLogs () {
    // Get all logs
    let logfiles = await fs.readdir(this._logPath, 'utf8')

    // Make sure we only have log files, sorted ascending
    logfiles = logfiles.filter((elem) => /\.log$/.test(elem))
    logfiles = logfiles.sort()

    // Now use this loop to remove files until there are max 30
    // files left. Prevents disk space running full.
    while (logfiles.length > 30) {
      // Remove the first file from the array
      let toRemove = path.join(this._logPath, logfiles.shift())
      await fs.unlink(toRemove)
    }
  }

  /**
   * Migrates potential pre-boot messages to the internal log
   */
  _migratePreBootLog () {
    let logs = global.preBootLog || []
    if (!Array.isArray(logs)) logs = [logs]

    for (let entry of logs) {
      // "level" and "message are obligatory"
      if (hasProp.call(entry, 'level') && hasProp.call(entry, 'message')) {
        // Level must be supported
        if (![
          LOG_LEVEL_VERBOSE,
          LOG_LEVEL_INFO,
          LOG_LEVEL_WARNING,
          LOG_LEVEL_ERROR
        ].includes(entry.level)) continue

        // Failsafe for empty details
        if (!hasProp.call(entry, 'details')) entry.details = {}
        // Append it
        this.log(entry.level, entry.message, entry.details)
      }
    }
  }

  async _append () {
    if (this._fileLock) return // Cannot write until the previous write has finished
    if (this._entryPointer >= this._log.length - 1) return // Nothing to write

    // First slice the part of the log that is not yet written to file
    let logsToWrite = this._log.slice(this._entryPointer)
    // Push forward the pointer to the end of the log.
    // Attention: At the current state, it references a
    // non-existing index, but this is checked in line 1
    // of this function.
    this._entryPointer = this._log.length

    // Now, filter out all verbose entries
    logsToWrite = logsToWrite.filter((entry) => entry.level > LOG_LEVEL_VERBOSE)

    // Then map the entries to strings and join them with newlines
    logsToWrite = logsToWrite.map((elem) => this._toString(elem))
    if (logsToWrite.length === 0) return // Apparently, only verbose messages
    logsToWrite = logsToWrite.join('\n') + '\n' // Trailing newline

    // Finally, append these guys to the current logfile
    let logfile = path.join(this._logPath, this._getLogfileName())

    this._fileLock = true
    await fs.writeFile(logfile, logsToWrite, { flag: 'a' })
    this._fileLock = false
  }

  /**
   * Returns a timestamp in the format HH:MM:SS.
   */
  _getTimestamp () {
    let date = new Date()
    let hour = date.getHours()
    let min = date.getMinutes()
    let sec = date.getSeconds()
    if (hour < 10) hour = '0' + hour
    if (min < 10) min = '0' + min
    if (sec < 10) sec = '0' + sec
    return hour + ':' + min + ':' + sec
  }

  /**
   * Returns the current log file name (dynamically
   * generated when Zettlr runs overnight).
   */
  _getLogfileName () {
    let date = new Date()
    let year = date.getFullYear()
    let month = date.getMonth() + 1
    let day = date.getDate()
    if (month < 10) month = '0' + month
    if (day < 10) day = '0' + day
    return `${year}-${month}-${day}.log`
  }

  /**
   * Converts a message to a simple string.
   * @param {Object} message The message to stringify
   */
  _toString (message) {
    let level = 'Verbose'
    if (message.level === LOG_LEVEL_INFO) level = 'Info'
    if (message.level === LOG_LEVEL_WARNING) level = 'Warning'
    if (message.level === LOG_LEVEL_ERROR) level = 'Error'

    let details = ''
    if (Object.keys(message.details) > 0) {
      details = ` | Details: ${JSON.stringify(message.details)}`
    }

    let timestamp = (hasProp.call(message, 'time')) ? `[${message.time}] ` : ''

    return `${timestamp}[${level}] ${message.message}${details}`
  }
}

module.exports = new LogProvider()
