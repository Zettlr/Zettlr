// We cannot have any imports or exports, as otherwise this file would not
// be read in by TypeScript as an ambient module declaration.
// More info: https://stackoverflow.com/a/35074833

/**
 * DECLARE THE GLOBAL INTERFACES
 */
interface LogProvider {
  verbose: (message: string, details?: any) => void
  info: (message: string, details?: any) => void
  warning: (message: string, details?: any) => void
  error: (message: string, details?: any) => void
  showLogViewer: () => void
}

interface CssProvider {
  on: (event, callback) => void
  off: (event, callback) => void
  get: () => string
  set: (newContent: string) => boolean
  getPath: () => string
}

// Before the log provider has booted, these messages will be added to the
// preBootLog
interface BootLog {
  level: 1|2|3|4 // Taken from the LogLevel enum in the Log Provider
  message: string
  details?: any
}

/**
 * Finally, declare and extend the global NodeJS object to enable the globals
 * for the service providers.
 */
declare module NodeJS {
  interface Global {
    css: CssProvider
    log: LogProvider
    store: any
    notify: any
    notifyError: any
    ipc: any
    citeproc: any // CiteprocProvider
    config: any
    application: any
    typo: any
    filesToOpen: string[]
    preBootLog: BootLog[]
    tippy: any
    updates: any
    targets: any
    recentDocs: any
    tags: any
  }
}
