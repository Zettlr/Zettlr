interface TrayProvider {
  add: (show: () => void, quit: () => void) => void
  remove: () => void
}
