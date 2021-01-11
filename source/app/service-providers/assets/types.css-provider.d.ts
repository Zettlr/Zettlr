interface CssProvider {
  on: (event, callback) => void
  off: (event, callback) => void
  get: () => string
  set: (newContent: string) => boolean
  getPath: () => string
}
