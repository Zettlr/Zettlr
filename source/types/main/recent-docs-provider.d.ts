interface RecentDocumentsProvider {
  add: (docPath: string) => void
  clear: () => void
  get: () => string[]
  on: (message: string, callback: (...args: any[]) => void) => void
  off: (message: string, callback: (...args: any[]) => void) => void
}
