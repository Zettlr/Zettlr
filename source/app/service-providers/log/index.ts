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

import path from 'path'
import { promises as fs } from 'fs'
import { app, ipcMain } from 'electron'
import chalk from 'chalk'
import ProviderContract from '../provider-contract'

/**
 * How many logfiles should the app keep at most?
 *
 * @var {number}
 */
const LOG_FILES_TO_KEEP = 30

/**
 * Available LogLevels BUG: Somehow I have to declare this twice. That happens
 * if you devise a system for typings where you can put types "somewhere."
 */
enum LogLevel {
  verbose = 1,
  info = 2,
  warning = 3,
  error = 4
}

/**
 * A single log message
 */
export interface LogMessage {
  time: string
  level: LogLevel
  message: string
  details?: Error|Record<string, any>|number|string|boolean|any[]
}

const debugConsole = {
  error: function (message: string) { console.error(chalk.bold.red(message)) },
  warn: function (message: string) { console.warn(chalk.yellow(message)) },
  info: function (message: string) { console.log(chalk.blueBright(message)) },
  verbose: function (message: string) { console.log(chalk.grey(message)) }
}

export default class LogProvider extends ProviderContract {
  private readonly _logPath: string
  private readonly _log: LogMessage[]
  private _entryPointer: number
  private _fileLock: boolean

  constructor () {
    super()
    this._logPath = path.join(app.getPath('userData'), 'logs')
    this._log = []
    this._entryPointer = 0 // Set the log entry file pointer to zero
    this._fileLock = false // True while data is being appended to the log

    // Ensure message handling
    ipcMain.handle('log-provider', (event, payload) => {
      const { command } = payload

      if (command === 'retrieve-log-chunk') {
        const nextIndex = parseInt(String(payload.nextIndex), 10)
        if (nextIndex >= this._log.length || nextIndex < 0) {
          return []
        }

        return this._log.slice(nextIndex)
      }
    })
  }

  public verbose (msg: string, details: any = null): void {
    this.log(LogLevel.verbose, msg, details)
  }

  public info (msg: string, details: any = null): void {
    this.log(LogLevel.info, msg, details)
  }

  public warning (msg: string, details: any = null): void {
    this.log(LogLevel.warning, msg, details)
  }

  public error (msg: string, details: any = null): void {
    this.log(LogLevel.error, msg, details)
  }

  async boot (): Promise<void> {
    this.verbose('Log provider booting up ...')
    await this._cleanLogs() // Remove all older logs
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  async shutdown (): Promise<void> {
    this.verbose('Log provider shutting down ...')
    await this._append() // One final append to flush the log
  }

  /**
   * Logs one entry to the internal log.
   * @param {number} logLevel The log level (defined atop of this file)
   * @param {string} message A short, human-readable error message
   * @param {any} details Optional details (completely customisable)
   */
  log (logLevel: LogLevel, message: string, details: any): void {
    if (details == null) {
      details = {} // No details -> empty object
    }

    // Simply append to log
    const msg = {
      level: logLevel,
      message,
      details,
      time: this._getTimestamp()
    }

    this._log.push(msg)

    if (!app.isPackaged) {
      // Also output to stdio
      const output = `[${msg.time}] ${msg.message}`
      switch (msg.level) {
        case LogLevel.error:
          debugConsole.error(output)
          // In case of an error, spit out anything that comes in
          console.error(msg.details)
          break
        case LogLevel.info:
          debugConsole.info(output)
          break
        case LogLevel.verbose:
          debugConsole.verbose(output)
          break
        case LogLevel.warning:
          debugConsole.warn(output)
          break
      }
    }

    this._append()
      .catch(err => this.error(`[Log Provider] Unexpected error during write: ${err.message as string}`, err))
  }

  /**
   * Removes old logfiles so that at max there are 30 files present.
   */
  async _cleanLogs (): Promise<void> {
    // Get all logs
    let logfiles = await fs.readdir(this._logPath, 'utf8')

    // Make sure we only have log files, sorted ascending
    logfiles = logfiles.filter((elem) => /\.log$/.test(elem))
    logfiles = logfiles.sort()

    // Now use this loop to remove files until there are max 30
    // files left. Prevents disk space running full.
    while (logfiles.length > LOG_FILES_TO_KEEP) {
      // Remove the first file from the array
      const nextLogFile = logfiles.shift()
      if (nextLogFile !== undefined) {
        let toRemove = path.join(this._logPath, nextLogFile)
        await fs.unlink(toRemove)
      }
    }
  }

  /**
   * Appends all not-yet-written log messages to today's log file
   */
  async _append (): Promise<void> {
    if (this._fileLock) {
      return // Cannot write until the previous write has finished
    }

    if (this._entryPointer >= this._log.length - 1) {
      return // Nothing to write
    }

    // First slice the part of the log that is not yet written to file
    let logsToWrite = this._log.slice(this._entryPointer)
    // Push forward the pointer to the end of the log.
    // Attention: At the current state, it references a
    // non-existing index, but this is checked in line 1
    // of this function.
    this._entryPointer = this._log.length

    // Now, filter out all verbose entries
    logsToWrite = logsToWrite.filter((entry) => entry.level > LogLevel.verbose)

    if (logsToWrite.length === 0) {
      return // Apparently, only verbose messages
    }

    // Then map the entries to strings and join them with newlines
    let stringsToWrite = logsToWrite.map((elem) => this._toString(elem))

    // Finally, append these guys to the current logfile
    let logfile = path.join(this._logPath, this._getLogfileName())

    this._fileLock = true
    await fs.writeFile(logfile, stringsToWrite.join('\n') + '\n', { flag: 'a' })
    this._fileLock = false
  }

  /**
   * Returns a timestamp in the format HH:MM:SS.
   */
  _getTimestamp (): string {
    let date = new Date()
    let hour = date.getHours().toString()
    let min = date.getMinutes().toString()
    let sec = date.getSeconds().toString()
    return `${hour.padStart(2, '0')}:${min.padStart(2, '0')}:${sec.padStart(2, '0')}`
  }

  /**
   * Returns the current log file name (dynamically
   * generated when Zettlr runs overnight).
   */
  _getLogfileName (): string {
    let date = new Date()
    let year = date.getFullYear().toString()
    let month = (date.getMonth() + 1).toString()
    let day = date.getDate().toString()
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}.log`
  }

  /**
   * Converts a message to a simple string.
   * @param {LogMessage} message The message to stringify
   */
  _toString (message: LogMessage): string {
    let level = 'Verbose'
    if (message.level === LogLevel.info) {
      level = 'Info'
    }
    if (message.level === LogLevel.warning) {
      level = 'Warning'
    }
    if (message.level === LogLevel.error) {
      level = 'Error'
    }

    let details = ''
    if (message.details instanceof Error) {
      // There was an error object in the details, so stringify it
      const name = message.details.name
      const msg = message.details.message
      const stack = (message.details.stack !== undefined)
        ? message.details.stack.replace(/\n+/g, ' --> ')
        : 'No stack trace provided'
      details = ` | Native Error: ${name}; ${msg} Stack Trace: ${stack}`
    } else if (Array.isArray(message.details)) {
      details = ` | Details: ${message.details.join(', ')}`
    } else if (typeof message.details !== 'object') {
      details = ` | Details: ${String(message.details)}`
    } else if (message.details !== undefined && Object.keys(message.details).length > 0) {
      details = ` | Details: ${JSON.stringify(message.details)}`
    }

    let timestamp = ('time' in message) ? `[${message.time}] ` : ''

    return `${timestamp}[${level}] ${message.message}${details}`
  }
}
