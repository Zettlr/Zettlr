/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Takes care of downloading any updates to the app.
 *
 * END HEADER
 */

import {
  createWriteStream,
  promises as fs,
  type ReadStream,
  type WriteStream
} from 'fs'

import path from 'path'
import crypto from 'crypto'
import got, { type Response } from 'got'
import semver from 'semver'

import { ipcMain, app, shell, dialog } from 'electron'
import { trans } from '@common/i18n-main'
import isFile from '@common/util/is-file'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type CommandProvider from '../commands'
import type ConfigProvider from '@providers/config'
import { md2html } from '@common/modules/markdown-utils'
import { showNativeNotification } from '@common/util/show-notification'
import type WindowProvider from '../windows'

/**
 * Struct which represents a single asset provided for by the updater
 */
export interface UpdateAsset {
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
export interface ServerAPIResponse {
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
export interface UpdateState {
  /**
   * If lastErrorMessage is not undefined, an error occurred. The error
   * corresponds to the got error classes
   */
  lastErrorMessage: string|undefined
  /**
   * Contains the last error code
   */
  lastErrorCode: string|undefined
  /**
   * Whether or not an update is available
   */
  updateAvailable: boolean
  /**
   * When the last update check happened (in Milliseconds as returned from Date.now())
   */
  lastCheck?: number
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
   * The file containing the SHA256 checksums
   */
  checksumFile?: UpdateAsset
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

type UpdateErrorCode = 'ERR_BODY_PARSE_FAILURE'|'SHA_CHECKSUM_ERR'
/**
 * Custom updater error that supports an error code
 */
class UpdateError extends Error {
  constructor (readonly code: UpdateErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
  }
}

const CUR_VER = app.getVersion()
const REPO_URL = 'https://zettlr.com/api/releases/latest'
const RELEASE_PAGE = 'https://github.com/Zettlr/Zettlr/releases'
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 // 1 hour

/**
 * Returns a clean update state with default values
 *
 * @return  {UpdateState}  The clean state
 */
function getUpdateState (): UpdateState {
  return {
    lastErrorMessage: undefined,
    lastErrorCode: undefined,
    updateAvailable: false,
    prerelease: false,
    changelog: '',
    releasePage: RELEASE_PAGE,
    tagName: '',
    compatibleAssets: [],
    name: '',
    full_path: '',
    size_total: 0,
    size_downloaded: 0,
    start_time: 0,
    eta_seconds: 0
  }
}

export default class UpdateProvider extends ProviderContract {
  private readonly _sha256Data: Map<string, string>
  private _updateState: UpdateState
  private _downloadReadStream: undefined|ReadStream
  private _downloadWriteStream: undefined|WriteStream

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _commands: CommandProvider,
    private readonly _windows: WindowProvider
  ) {
    super()
    this._logger.verbose('Update provider booting up ...')

    this._sha256Data = new Map()

    // Initialize the update state
    this._updateState = getUpdateState()

    // Initialize the write/read streams used during downloads
    this._downloadReadStream = undefined
    this._downloadWriteStream = undefined

    // Handle events
    ipcMain.handle('update-provider', async (event, data) => {
      const { command, payload } = data

      if (command === 'check-for-update') {
        await this.check()
      } else if (command === 'update-status') {
        // Just provide the caller with our response
        return this._updateState
      } else if (command === 'request-app-update') {
        // We shall download the URL which is in the content variable
        this._logger.info('[Update Provider] Requesting update ' + (payload as string))
        this._downloadAppUpdate(payload as string)
      } else if (command === 'begin-update') {
        // Begin the actual update process NOTE We're not blocking the handler
        this._beginUpdate()
          .catch(e => {
            this._logger.error(`[Update Provider] Unexpected error during update process: ${e.message as string}`, e)
          })
        return true
      }
    })
  }

  applicationUpdateAvailable (): boolean {
    return this._updateState.updateAvailable
  }

  getUpdateState (): UpdateState {
    return this._updateState
  }

  /**
   * Resets the update state, and emits an update message.
   */
  private _resetState (): void {
    this._updateState = getUpdateState()
    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)
  }

  /**
   * Utility function to report an error both to the logs and to the update window
   *
   * @param   {string}   code          The error code
   * @param   {string}   message       The error message
   * @param   {boolean}  showErrorBox  Whether to display an error box to the user
   */
  private _reportError (code: string, message: string, showErrorBox: boolean): void {
    this._logger.error(`[Update Provider] ${code}: ${message}`)
    this._updateState.lastErrorCode = code
    this._updateState.lastErrorMessage = message
    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)
    if (showErrorBox) {
      dialog.showErrorBox(
        trans('Cannot check for update'),
        trans('There was an error while checking for updates. %s: %s', code, message)
      )
    }
  }

  /**
   * Runs a query to the API for new versions
   *
   * @return {Promise} Resolves only when there is an update available.
   */
  async check (): Promise<void> {
    // First, reset the update state
    this._resetState()

    try {
      this._logger.info(`[Update Provider] Checking ${REPO_URL} for application updates ...`)
      const response: Response<string> = await got(REPO_URL, {
        timeout: { request: 5000 },
        method: 'GET',
        searchParams: new URLSearchParams([
          [ 'accept-beta', this._config.get('checkForBeta') ]
        ])
      })

      // Next: Parse the result
      this._updateState = await this._parseResponse(response)
      broadcastIpcMessage('update-provider', 'state-changed', this._updateState)

      // At this point, notify the user if applicable
      if (this.applicationUpdateAvailable()) {
        this._logger.info(`[Update Provider] New update available! Please update to ${this._updateState.tagName} soon!`)
        // Immediately retrieve the SHA checksum file so we have it available.
        await this._retrieveSHA256Sums()

        // Then notify the user
        const { tagName } = this.getUpdateState()
        const result = await dialog.showMessageBox({
          type: 'info',
          title: trans('Update available'),
          message: trans('An update to version %s is available!', tagName),
          detail: trans('Please update at your earliest convenience. You can open the updater now, or update later.'),
          buttons: [
            trans('Open updater'),
            trans('Not now')
          ],
          defaultId: 0,
          cancelId: 1
        })

        if (result.response === 0) {
          this._windows.showUpdateWindow()
        }
      } else {
        this._logger.info(`[Update Provider] No new update available. Current version is ${this._updateState.tagName}.`)
      }
    } catch (err: any) {
      if (err instanceof UpdateError) {
        this._reportError(err.code, err.message, true)
        return
      }

      // See for all errors https://github.com/sindresorhus/got/blob/main/documentation/8-errors.md
      // If we have an ENOTFOUND error there is no response and no statusCode
      // so we'll use TypeScript shortcuts to save us from ugly errors.
      const notFoundError = err.code === 'ENOTFOUND'
      const serverError = err?.response?.statusCode >= 500
      const clientError = err?.response?.statusCode >= 400
      const redirectError = err?.response?.statusCode >= 300

      // Give a more detailed error message.
      if (serverError) {
        const msg = trans('Could not check for updates: Server Error (Status code: %s)', err.response.statusCode)
        this._reportError(err.code as string, msg, false)
      } else if (clientError) {
        const msg = trans('Could not check for updates: Client Error (Status code: %s)', err.response.statusCode)
        this._reportError(err.code as string, msg, false)
      } else if (redirectError) {
        const msg = trans('Could not check for updates: The server tried to redirect (Status code: %s)', err.response.statusCode)
        this._reportError(err.code as string, msg, true) // This is odd and should be reported
      } else if (notFoundError) {
        // getaddrinfo has reported that the host has not been found.
        // This normally only happens if the networking interface is
        // offline. In this case, no need to inform the user every hour.
        const msg = trans('Could not check for updates: Could not establish connection')
        this._reportError(err.code as string, msg, false)
      } else {
        // Something else has occurred. GotError objects have a name property.
        const msg = trans('Could not check for updates. %s: %s', err.name, err.message)
        this._reportError(err.code as string, msg, true) // This is odd and should be reported
      }
    }
  }

  /**
   * Parses the response body from the update query and
   * if applicable.
   *
   * @param {Response} response The response from the server
   */
  private async _parseResponse (response: Response<string>): Promise<UpdateState> {
    // Error handling
    if (response.body.trim() === '') {
      throw new UpdateError('ERR_BODY_PARSE_FAILURE', trans('Could not check for updates: Server hasn\'t sent any data'))
    }

    // First we need to parse the JSON data.
    const parsedResponse = JSON.parse(response.body) as ServerAPIResponse
    const state = getUpdateState()

    const lv = semver.parse(CUR_VER) // localVersion
    const rv = semver.parse(parsedResponse.tag_name) // remoteVersion

    if (lv === null || rv === null) {
      this._cleanup()
      const error = new Error('Cannot complete check for new version: Either the local or remote version could not be parsed!')
      this._logger.error(error.message, { localVersion: lv, remoteVersion: rv })
      throw error
    }
  
    // We have one issue (#5429), namely that Zettlr follows the convention to
    // declare nightlies using the SAME major/minor/patch as the current stable
    // release with "-nightly" appended to it. However, under strict SemVer
    // rules, this makes the nightlies a *prerelease* (and not a ...
    // "postrelease"...? I don't think this term exists). Here we have to do a
    // bit of manual engineering to account for this edge case.

    // First, store the regular check in the variable ...
    state.updateAvailable = semver.lt(lv, rv)
    // ... and then check if the versions match up except for the local one
    // having "nightly" in its prerelease array.
    if (
      lv.major === rv.major && lv.minor === rv.minor && lv.patch === rv.patch &&
      lv.prerelease.includes('nightly')
    ) {
      state.updateAvailable = false
    }

    // Adapt the rest of the state
    state.tagName = parsedResponse.tag_name
    state.changelog = md2html(parsedResponse.body, (_c1, _c2) => undefined)
    state.prerelease = parsedResponse.prerelease
    state.releasePage = parsedResponse.html_url

    state.compatibleAssets = parsedResponse.assets.filter((asset) => {
      // Filter out the assets unusable on the current platform.
      const assetArch = /arm64|aarch64/.test(asset.name) ? 'arm64' : 'x64'
      if (process.arch !== assetArch) {
        return false
      }

      // Determine compatibility based on the file extensions
      switch (process.platform) {
        case 'darwin':
          return /\.dmg$/i.test(asset.name)
        case 'win32':
          return /\.exe$/i.test(asset.name)
        case 'linux':
          return /\.(?:AppImage|deb|rpm)$/i.test(asset.name)
      }

      return false
    })

    state.lastCheck = Date.now()

    state.checksumFile = parsedResponse.assets.find((asset) => {
      return asset.name === 'SHA256SUMS.txt'
    })

    return state
  }

  /**
   * Attempts to download and parse the SHA 256 sums for the releases
   *
   * @return {boolean} The success or failure of the operation
   */
  private async _retrieveSHA256Sums (): Promise<void> {
    if (this._updateState.checksumFile === undefined) {
      throw new UpdateError('SHA_CHECKSUM_ERR', trans('The SHA256 checksums file seems to be missing for this release.'))
    }

    // Let's download the SHA256 data as well
    try {
      const response = await got(
        this._updateState.checksumFile.browser_download_url,
        { method: 'GET', timeout: 5000 }
      )

      // Now we need to parse the data. It looks like this:
      // [sha256 sum]  [binary name]
      // So we first need to split on newlines and then on spaces
      response.body
        .split('\n')
        .map(release => release.split(/\s+/))
        .filter(release => release.length === 2)
        .map(release => {
          this._logger.info(`[Update Provider] Found SHA256 checksum for ${release[1]}`)
          this._sha256Data.set(release[1], release[0])
        })
    } catch (err: any) {
      throw new UpdateError('SHA_CHECKSUM_ERR', trans('Cannot retrieve SHA256 checksums: %s', err.message), { cause: err })
    }
  }

  /**
   * Download the given application update
   *
   * @param {string} url The URL to download
   */
  private _downloadAppUpdate (url: string): void {
    // First, let's find the update
    const updateToPull = this._updateState.compatibleAssets.find((elem) => {
      return elem.browser_download_url === url
    })

    if (updateToPull === undefined) {
      this._reportError('ENOTFOUND', trans(`Refused to download file ${url}: URL is not in the list of server-provided assets`), true)
      return
    }

    // Save to downloads folder
    const destination = path.join(app.getPath('downloads'), updateToPull.name)

    // The read stream reads the remote binary file, the write stream pipes that
    // data through to the local file.
    this._downloadWriteStream = createWriteStream(destination)
    this._downloadReadStream = got.stream(updateToPull.browser_download_url) as unknown as ReadStream

    // Preset the appropriate values on the internal state
    this._updateState.name = updateToPull.name
    this._updateState.full_path = destination
    this._updateState.size_total = updateToPull.size
    this._updateState.size_downloaded = 0
    this._updateState.start_time = Date.now()
    this._updateState.eta_seconds = 0

    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)

    this._downloadReadStream.on('data', (chunk) => {
      if (this._downloadWriteStream === undefined) {
        this._cleanup(true)
        this._reportError('EWRITESTREAM', trans('Could not accept data for application update: Write stream is gone.'), true)
        return
      }

      const now = Date.now()
      this._updateState.size_downloaded += chunk.length
      const secondsPassed = (now - this._updateState.start_time) / 1000
      const bytesPerSecond = this._updateState.size_downloaded / secondsPassed
      const bytesRemaining = this._updateState.size_total - this._updateState.size_downloaded
      this._updateState.eta_seconds = Math.round(bytesRemaining / bytesPerSecond)
      broadcastIpcMessage('update-provider', 'state-changed', this._updateState)
      this._downloadWriteStream.write(chunk)
    })

    this._downloadReadStream.on('end', () => {
      // Close the write stream. This will free the file handle, which is
      // important on Windows for the next step, because if this is not done,
      // Windows will refuse to open the file and emit an error that the file is
      // still in use.
      this._downloadWriteStream?.end()
      this._logger.info(`Successfully downloaded ${this._updateState.name}. Transferred ${this._updateState.size_downloaded} bytes overall.`)
      showNativeNotification(`Download of ${this._updateState.name} successful!`, 'Update', () => {
        // The user has clicked the notification, so we can show the update window here
        this._commands.run('open-update-window', undefined)
          .catch(e => this._logger.error(String(e.message), e))
      })
    })

    this._downloadReadStream.on('error', (err) => {
      this._cleanup(true)
      this._reportError('EREADSTREAM', `Download Read Stream Error: ${err.message}`, true)
    })

    this._downloadWriteStream.on('error', (err) => {
      this._cleanup(true)
      this._reportError('EWRITESTREAM', `Download Write Stream Error: ${err.message}`, true)
    })
  }

  /**
   * Verify the downloaded binary file and then commence the update process
   * by launching the installer and closing the app.
   */
  async _beginUpdate (): Promise<void> {
    // What this function does:
    // 1. Download the SHA checksums
    // 2. Check that the file is correct
    // 3. Launch the file
    // 4. Quit the app
    showNativeNotification('Verifying update ...')

    const correctSHA = this._sha256Data.get(this._updateState.name)

    if (correctSHA === undefined) {
      this._cleanup(true)
      this._reportError('EVERIFY', trans('Could not verify the integrity of the downloaded update. Please retry or update manually.'), true)
      return
    }

    const sha256sum = crypto.createHash('sha256')
    const fileContents = await fs.readFile(this._updateState.full_path)
    sha256sum.update(fileContents)
    const downloadSHA = sha256sum.digest('hex')

    if (downloadSHA !== correctSHA) {
      showNativeNotification('Could not verify update. Please retry or download manually.')
      this._cleanup(true)
      this._reportError('EVERIFY', trans('The downloaded file has a different checksum than the server reported. Please retry or update manually.'), true)
      return
    } else {
      this._logger.info(`[Update Provider] Successfully verified the checksum of ${this._updateState.name} (${downloadSHA})!`)
    }

    // Then launch the file and immediately quit the app.
    try {
      if (this._updateState.full_path.endsWith('.AppImage')) {
        // AppImages need to be manually moved by the user
        await shell.openPath(path.dirname(this._updateState.full_path))
      } else {
        // Everything else can be opened as is
        await shell.openPath(this._updateState.full_path)
      }
      app.quit()
    } catch (err: any) {
      this._cleanup(false)
      this._reportError('EOPEN', trans('Could not start update. Please retry or update manually. Error was: %s', err.message), true)
    }
  }

  /**
   * Cleans up after a completed or partial download, setting the provider state
   * to begin another download.
   *
   * @param   {boolean}  unlinkFile  Whether to also remove the (partial) files
   */
  private _cleanup (unlinkFile: boolean = false): void {
    // First, clean out the download write stream
    if (this._downloadWriteStream !== undefined) {
      try {
        this._downloadWriteStream.close()
      } catch (err: any) {
        this._logger.warning(`[Update Provider] Could not close write stream: ${err.message as string}`, err)
      }
      this._downloadWriteStream = undefined
    }
    // Second the read stream
    if (this._downloadReadStream !== undefined) {
      try {
        this._downloadReadStream.close()
      } catch (err: any) {
        this._logger.warning(`[Update Provider] Could not close read stream: ${err.message as string}`, err)
      }
      this._downloadWriteStream = undefined
    }

    // Also reset the state
    this._resetState()

    if (!unlinkFile || !isFile(this._updateState.full_path)) {
      return
    }

    // We shall also unlink the file
    fs.unlink(this._updateState.full_path)
      .catch(e => {
        this._logger.error(`[Update Provider] Could not remove partial download file ${this._updateState.full_path}.`, e)
      })
  }

  async boot (): Promise<void> {
    // Initiate the update check
    setInterval(() => {
      // Only check if the user wants to, and if there is not yet a new version.
      const { checkForUpdates } = this._config.get().system
      if (!checkForUpdates || this.applicationUpdateAvailable()) {
        return
      }

      this.check().catch(err => {
        this._logger.error('[Update Provider] Could not check for updates: Unexpected error', err)
      })
    }, UPDATE_CHECK_INTERVAL)

    // One initial check (if applicable)
    if (!this._config.get().system.checkForUpdates) {
      return
    }

    this.check().catch(err => {
      this._logger.error('[Update Provider] Could not check for updates: Unexpected error', err)
    })
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Update provider shutting down ...')
    // We'll be removing the file IF and only IF the download was not finished.
    const downloadUnfinished = this._updateState.size_downloaded > 0 && this._updateState.size_downloaded !== this._updateState.size_total
    this._cleanup(downloadUnfinished)
  }
}
