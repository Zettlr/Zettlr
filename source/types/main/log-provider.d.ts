interface LogProvider {
  verbose: (message: string, details?: any) => void
  info: (message: string, details?: any) => void
  warning: (message: string, details?: any) => void
  error: (message: string, details?: any) => void
}

// Before the log provider has booted, these messages will be added to the
// preBootLog
interface BootLog {
  level: LogLevel // Taken from the LogLevel enum in the Log Provider
  message: string
  details?: any
}

/**
 * Available LogLevels
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
interface LogMessage {
  time: string
  level: LogLevel
  message: string
  details: any
}
