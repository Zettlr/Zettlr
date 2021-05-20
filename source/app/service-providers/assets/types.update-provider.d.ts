interface UpdateProvider {
  check: () => void // Initiates an update check programmatically
  applicationUpdateAvailable: () => boolean // True if an update is available
}

// Holds information about an update being downloaded right now
interface UpdateDownloadProgress {
  name: string
  full_path: string
  size_total: number
  size_downloaded: number
  start_time: number
  eta_seconds: number
  download_percent: number
  finished: boolean
  isCurrentlyDownloading: boolean
}

// Basically the API response with a few additional properties
interface ParsedAPIResponse {
  newVer: string
  curVer: string
  isNewer: boolean
  changelog: string
  releaseURL: string
  isBeta: boolean
  assets: UpdateAsset[]
  sha256Asset: UpdateAsset|undefined
}
