interface RecentDocumentsProvider {
  add: (doc: MDFileDescriptor|CodeFileMeta) => void
  clear: () => void
  get: () => any[]
  hasDocs: () => boolean
  on: (message: string, callback: Function) => void
  off: (message: string, callback: Function) => void
}
