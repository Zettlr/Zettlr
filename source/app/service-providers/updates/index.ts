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

import { ipcMain, app, shell } from 'electron'
import { trans } from '@common/i18n-main'
import isFile from '@common/util/is-file'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import type CommandProvider from '../commands'
import type ConfigProvider from '@providers/config'
import { md2html } from '@common/modules/markdown-utils'
import { showNativeNotification } from '@common/util/show-notification'

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

const CUR_VER = app.getVersion()
const REPO_URL = 'https://zettlr.com/api/releases/latest'

export default class UpdateProvider extends ProviderContract {
  private readonly _sha256Data: Map<string, string>
  private _updateState: UpdateState
  private _downloadReadStream: undefined|ReadStream
  private _downloadWriteStream: undefined|WriteStream

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _commands: CommandProvider
  ) {
    super()
    this._logger.verbose('Update provider booting up ...')

    this._sha256Data = new Map()

    // Initialize the update state
    this._resetState()

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
        this._downloadAppUpdate(payload)
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
   * This internal function resets the internal update state to its initial.
   */
  private _resetState (): void {
    this._updateState = {
      lastErrorMessage: undefined,
      lastErrorCode: undefined,
      updateAvailable: false,
      prerelease: false,
      changelog: '',
      releasePage: 'https://github.com/Zettlr/Zettlr/releases',
      tagName: '',
      compatibleAssets: [],
      name: '',
      full_path: '',
      size_total: 0,
      size_downloaded: 0,
      start_time: 0,
      eta_seconds: 0
    }

    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)
  }

  /**
   * Utility function to report an error both to the logs and to the update window
   *
   * @param   {string}  code     The error code
   * @param   {string}  message  The error message
   */
  private _reportError (code: string, message: string): void {
    this._logger.error(`[Update Provider] ${code}: ${message}`)
    this._updateState.lastErrorCode = code
    this._updateState.lastErrorMessage = message
    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)
  }

  /**
   * Runs a query to the API for new versions
   *
   * @return {Promise} Resolves only when there is an update available.
   */
  async check (): Promise<void> {
    // First, reset the update state
    this._logger.info('[Update Provider] Checking for application updates ...')
    this._resetState()

    try {
      this._logger.info(`[Updater] Checking ${REPO_URL} for updates ...`)
      const response: Response<string> = await got(REPO_URL, {
        // I'm currently on Mälartåg and, despite WiFi normally being pretty good,
        // it's abysmally slow right now, and I noticed that the update check was
        // taking forever to complete, which prevented the app from properly
        // booting up. Then I realized that got by default does not include any
        // timeout, so I'm adding one here (+ decouple the update check from the
        // boot cycle further below)
        timeout: { request: 5000 },
        method: 'GET',
        searchParams: new URLSearchParams([
          [ 'accept-beta', this._config.get('checkForBeta') ]
        ])
      })

      // Next: Parse the result
      return await this._parseResponse(response)
    } catch (err: any) {
      // See for all errors https://github.com/sindresorhus/got/blob/main/documentation/8-errors.md
      // If we have an ENOTFOUND error there is no response and no statusCode
      // so we'll use TypeScript shortcuts to save us from ugly errors.
      const notFoundError = err.code === 'ENOTFOUND'
      const serverError = err?.response?.statusCode >= 500
      const clientError = err?.response?.statusCode >= 400
      const redirectError = err?.response?.statusCode >= 300

      let msg = ''

      // Give a more detailed error message.
      if (serverError) {
        msg = trans('Could not check for updates: Server Error (Status code: %s)', err.response.statusCode)
      } else if (clientError) {
        msg = trans('Could not check for updates: Client Error (Status code: %s)', err.response.statusCode)
      } else if (redirectError) {
        msg = trans('Could not check for updates: The server tried to redirect (Status code: %s)', err.response.statusCode)
      } else if (notFoundError) {
        // getaddrinfo has reported that the host has not been found.
        // This normally only happens if the networking interface is
        // offline.
        msg = trans('Could not check for updates: Could not establish connection')
      } else {
        // Something else has occurred. GotError objects have a name property.
        msg = trans('Could not check for updates. %s: %s', err.name, err.message)
      }

      this._reportError(err.code, msg)
    }
  }

  /**
   * Parses the response body as given in this._response and returns update data,
   * if applicable.
   *
   * @param {Response} response The response from the server
   */
  private async _parseResponse (response: Response<string>): Promise<void> {
    // Error handling
    if (response.body.trim() === '') {
      this._reportError('ERR_BODY_PARSE_FAILURE', trans('Could not check for updates: Server hasn\'t sent any data'))
      return
    }

    // First we need to parse the JSON data.
    const parsedResponse: ServerAPIResponse = JSON.parse(response.body)

    this._updateState.tagName = parsedResponse.tag_name
    this._updateState.updateAvailable = semver.lt(CUR_VER, parsedResponse.tag_name)
    this._updateState.changelog = md2html(parsedResponse.body, (_c1, _c2) => undefined)
    this._updateState.prerelease = parsedResponse.prerelease
    this._updateState.releasePage = parsedResponse.html_url

    this._updateState.compatibleAssets = parsedResponse.assets.filter((asset) => {
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

    this._updateState.lastCheck = Date.now()

    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)

    if (this._updateState.updateAvailable) {
      this._logger.info(`[Update Provider] New update available! Please update to ${this._updateState.tagName} soon!`)
      // Immediately retrieve the SHA checksum file
      const checksumFile = parsedResponse.assets.find((asset) => {
        return asset.name === 'SHA256SUMS.txt'
      })

      if (checksumFile !== undefined) {
        await this._retrieveSHA256Sums(checksumFile.browser_download_url)
      } else {
        this._reportError('SHA_CHECKSUM_ERR', 'Could not retrieve SHA256 checksums.')
      }
    } else {
      this._logger.info(`[Update Provider] No new update available. Current version is ${this._updateState.tagName}.`)
    }
  }

  /**
   * Attempts to download and parse the SHA 256 sums for the releases
   *
   * @return {boolean} The success or failure of the operation
   */
  private async _retrieveSHA256Sums (checksumFile: string): Promise<boolean> {
    // Let's download the SHA256 data as well
    try {
      const response = await got(checksumFile, { method: 'GET' })

      // Now we need to parse the data. It looks like this:
      // [sha256 sum]  [binary name]
      // So we first need to split on newlines and then on spaces
      const checksums: string[][] = response.body.split('\n').map(release => release.split(/\s+/))
      checksums.forEach(release => {
        if (release.length !== 2) {
          return
        }
        this._logger.info(`[Update Provider] Found SHA256 checksum for ${release[1]}`)
        this._sha256Data.set(release[1], release[0])
      })

      return true
    } catch (err: any) {
      this._reportError(err.code, 'Could not retrieve SHA256 checksums.')
      return false
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
      this._reportError('ENOTFOUND', `Could not download update ${url}: URL is not in assets`)
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

    this._downloadReadStream.on('data', (chunk: Buffer) => {
      if (this._downloadWriteStream === undefined) {
        this._cleanup(true)
        this._reportError('EWRITESTREAM', 'Could not accept data for application update: Write stream is gone.')
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
      this._reportError('EREADSTREAM', `Download Read Stream Error: ${err.message}`)
    })

    this._downloadWriteStream.on('error', (err) => {
      this._cleanup(true)
      this._reportError('EWRITESTREAM', `Download Write Stream Error: ${err.message}`)
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
      showNativeNotification('Could not verify update. Please retry or download manually.')
      this._cleanup(true)
      this._reportError('EVERIFY', 'Could not verify the download! Please retry or download manually.')
      return
    }

    const sha256sum = crypto.createHash('sha256')
    const fileContents = await fs.readFile(this._updateState.full_path)
    sha256sum.update(fileContents)
    const downloadSHA = sha256sum.digest('hex')

    if (downloadSHA !== correctSHA) {
      showNativeNotification('Could not verify update. Please retry or download manually.')
      this._cleanup(true)
      this._reportError('EVERIFY', 'Could not verify the download! Please retry or download manually.')
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
      showNativeNotification('Could not start update. Please install manually.')
      this._reportError('EOPEN', `Could not start update: ${err.message as string}.`)
    }
  }

  /**
   * Cleans up after a completed or partial download, setting the provider state
   * to begin another download.
   *
   * @param   {boolean}  unlinkFile  Whether to also remove the (partial) files
   */
  private _cleanup (unlinkFile = false): void {
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
    // Initiate a first check for updates
    const checkUpdates: boolean = this._config.get('system.checkForUpdates')
    if (checkUpdates) {
      this.check()
        .then(() => {
          if (this.applicationUpdateAvailable()) {
            const { tagName } = this.getUpdateState()
            this._logger.info(`Update available: ${tagName}`)
            showNativeNotification(trans('An update to version %s is available!', tagName))
          }
        })
        .catch(err => this._logger.error('[Update Provider] Could not check for updates: Unexpected error', err))
    }
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
