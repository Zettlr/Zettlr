interface UpdateProvider {
  check: () => void // Initiates an update check programmatically
  applicationUpdateAvailable: () => boolean // True if an update is available
}
