interface CssProvider {
  on: (event, callback) => void
  off: (event, callback) => void
  getPath: () => string
}
