// Before the log provider has booted, these messages will be added to the
// preBootLog
export interface BootLog {
  level: LogLevel // Taken from the LogLevel enum in the Log Provider
  message: string
  details?: any
}

/**
 * Available LogLevels
 */
export enum LogLevel {
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
  details: any
}
