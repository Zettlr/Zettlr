interface UpdateProvider {
  /**
   * Checks for updates by querying the API
   */
  check: () => void // Initiates an update check programmatically
  /**
   * Is a new version available? (Should be called after check())
   *
   * @return  {Boolean}  Whether or not a new version is available
   */
  applicationUpdateAvailable: () => boolean
  /**
   * Gets the current update status (should be called after check())
   *
   * @return  {UpdateState}  The full Update information
   */
  getUpdateState: () => UpdateState
}

/**
 * Struct which represents a single asset provided for by the updater
 */
interface UpdateAsset {
  /**
   * The filename of the asset
   */
  name: string
  /**
   * The total file size in bytes
   */
  size: number
  /**
   * The URL to download this asset
   */
  browser_download_url: string
}

/**
 * This struct contains the information returned by the Update API
 */
interface ServerAPIResponse {
  /**
   * GitHub's internal ID
   */
  id: number
  /**
   * The tag name of the new version
   */
  tag_name: string
  /**
   * The name of the new version
   */
  name: string
  /**
   * Whether the new version is a beta
   */
  prerelease: boolean
  /**
   * A link to the release page (currently unused)
   */
  html_url: string
  /**
   * The changelog (raw Markdown string)
   */
  body: string
  /**
   * The publication date (currently unused)
   */
  published_at: string
  /**
   * All assets available in this update
   */
  assets: UpdateAsset[]
}

/**
 * This struct holds all information necessary to guide a user through the
 * complete update process
 */
interface UpdateState {
  /**
   * If lastErrorMessage is not undefined, an error occurred. The error
   * corresponds to the got error classes
   */
  lastErrorMessage: string|undefined
  lastErrorCode: string|undefined
  /**
   * Whether or not an update is available
   */
  updateAvailable: boolean
  /**
   * Is this release a beta version?
   */
  prerelease: boolean
  /**
   * The tag name of the new version
   */
  tagName: string
  /**
   * Contains a link to the GitHub release page, used if there is no compatible asset
   */
  releasePage: string
  /**
   * The changelog of this update
   */
  changelog: string
  /**
   * A list of assets available for this specific computer
   */
  compatibleAssets: UpdateAsset[]
  /**
   * The release's name
   */
  name: string
  /**
   * The full path to the downloaded file
   */
  full_path: string
  /**
   * The total size in bytes
   */
  size_total: number
  /**
   * The size of the already downloaded chunk
   */
  size_downloaded: number
  /**
   * When the download has started
   */
  start_time: number
  /**
   * How long the update will approximately still need
   */
  eta_seconds: number
}
