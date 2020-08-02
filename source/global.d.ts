export {}

declare global {
  namespace NodeJS {
    // Tell typescript which global objects we have, to prevent compile errors
    interface Global {
      log: any
      store: any
      notify: any
      notifyError: any
      ipc: any
      citeproc: any // CiteprocProvider
      config: any
      application: any
      typo: any
      filesToOpen: any
      preBootLog: any
      tippy: any
    }
  }
}
