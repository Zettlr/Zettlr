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
  type WriteStream
} from 'fs'

import path from 'path'
import crypto from 'crypto'
import ky, { isHTTPError, isKyError, isNetworkError } from 'ky'
import semver from 'semver'
import { net } from 'electron'

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
import { pipeline } from 'stream/promises'
import { type PipelineSource, Transform } from 'stream'

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

/**
 * Verifies an unknown JSON payload that it conforms to the ServerAPIResponse
 * interface and is not malformed.
 *
 * @param   {unknown}  response  The untrusted JSON
 *
 * @return  {boolean}            True if the response corresponds to ServerAPIResponse.
 */
function verifyUpdateServerResponse (response: unknown): response is ServerAPIResponse {
  if (response == null || Array.isArray(response) || typeof response !== 'object') {
    return false
  }

  for (const prop of [ 'tag_name', 'name', 'html_url', 'body', 'published_at' ]) {
    // @ts-expect-error TypeScript doesn't know this is perfectly valid JS.
    if (!(prop in response) || typeof response[prop] !== 'string') {
      return false
    }
  }

  if (!('prerelease' in response) || typeof response.prerelease !== 'boolean') {
    return false
  }

  if (!('id' in response) || typeof response.id !== 'number') {
    return false
  }

  if (!('assets' in response) || !Array.isArray(response.assets)) {
    return false
  }

  return response.assets.every(asset => {
    return asset != null
      && typeof asset === 'object'
      && !Array.isArray(asset)
      && ('name' in asset) && typeof asset.name === 'string'
      && ('size' in asset) && typeof asset.size === 'number'
      && ('browser_download_url' in asset) && typeof asset.browser_download_url === 'string'
  })
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
        await this._downloadAppUpdate(payload as string)
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
    // (1) We do not check for updates upon hard limits, that is: if the
    // internet connection is down or if updates have been disabled at build
    // time.
    if (!net.online || __UPDATES_DISABLED__ === '1') {
      return
    }

    // (2) We also do not check upon soft limits, that is: if the user has
    // disabled update checks, or if there has been a check and an update is
    // available.
    const { checkForUpdates } = this._config.get().system
    if (!checkForUpdates || this.applicationUpdateAvailable()) {
      return
    }

    // In both cases, we retain the last update state. If none of these guards
    // hold, we can reset the update state and (re-)check.
    this._resetState()

    try {
      this._logger.info(`[Update Provider] Checking ${REPO_URL} for application updates ...`)
      let platformString = ''
      if (process.platform === 'win32') {
        platformString = `Windows NT 10.0; ${process.arch}`
      }
      if (process.platform === 'darwin') {
        platformString = `Macintosh; Intel Mac OS X ${process.getSystemVersion()}; ${process.arch}`
      }
      if (process.platform === 'linux') {
        platformString = `Linux ${process.arch === 'x64' ? 'x86_64' : process.arch}`
      }

      const response = await ky(REPO_URL, {
        timeout:  5000,
        method: 'GET',
        headers: {
          'User-Agent': `Zettlr/${CUR_VER} (${platformString})`
        },
        searchParams: new URLSearchParams([
          [ 'accept-beta', this._config.get('checkForBeta') ]
        ])
      })

      // Next: Parse the result
      const jsonData = await response.json()
      this._updateState = await this._parseResponse(jsonData)
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
        this._logger.verbose(`[Update Provider] No new update available. Current version is ${this._updateState.tagName}.`)
      }
    } catch (err: unknown) {
      // First, check for errors thrown after the update response has been received.
      if (err instanceof UpdateError) {
        this._reportError(err.code, err.message, true)
        return
      }

      // Next, report unexpected errors. (We only expect UpdateErrors that we throw, and KyErrors)
      if (!isKyError(err)) {
        this._reportError('Unexpected error', 'An unexpected error occurred while checking for updates', true)
        return
      }

      // Third, check for HTTP errors, for which we can give a more detailed error message.
      if (isHTTPError(err)) {
        const { status } = err.response
        if (status >= 500) {
          const msg = trans('Could not check for updates: Server Error (Status code: %s)', status)
          this._reportError(`Error ${status}`, msg, false)
        } else if (status >= 400 && status < 500) {
          const msg = trans('Could not check for updates: Client Error (Status code: %s)', status)
          this._reportError(`Error ${status}`, msg, false)
        } else if (status >= 300 && status < 400) {
          const msg = trans('Could not check for updates: The server tried to redirect (Status code: %s)', status)
          this._reportError(`Error ${status}`, msg, true) // This is odd and should be reported
        } else {
          // Something else has occurred. GotError objects have a name property.
          const msg = trans('Could not check for updates. %s: %s', err.name, err.message)
          this._reportError(err.name, msg, true) // This is odd and should be reported
        }
      }

      // Finally, report potential network errors.
      if (isNetworkError(err)) {
        const msg = trans('Could not check for updates: %s', err.cause ?? err.message)
        this._reportError(err.name, msg, false)
      }
    }
  }

  /**
   * Parses the response body from the update query and
   * if applicable.
   *
   * @param {Response} response The response from the server
   */
  private async _parseResponse (parsedResponse: unknown): Promise<UpdateState> {
    if (!verifyUpdateServerResponse(parsedResponse)) {
      console.log(parsedResponse)
      throw new UpdateError('ERR_BODY_PARSE_FAILURE', trans('Could not check for updates: Server has sent invalid data'))
    }

    // First we need to parse the JSON data.
    // const parsedResponse = JSON.parse(response.body) as ServerAPIResponse
    const state = getUpdateState()

    const localVersion = semver.parse(CUR_VER) // localVersion
    const remoteVersion = semver.parse(parsedResponse.tag_name) // remoteVersion

    if (localVersion === null || remoteVersion === null) {
      this._cleanup()
      const error = new Error('Cannot complete check for new version: Either the local or remote version could not be parsed!')
      this._logger.error(error.message, { localVersion, remoteVersion })
      throw error
    }
  
    // We have one issue (#5429), namely that Zettlr follows the convention to
    // declare nightlies using the SAME major/minor/patch as the current stable
    // release with "-nightly" appended to it. However, under strict SemVer
    // rules, this makes the nightlies a *prerelease* (and not a ...
    // "postrelease"...? I don't think this term exists). Here we have to do a
    // bit of manual engineering to account for this edge case.

    // NOTE: Zettlr makes use of major, minor, and patch versions, plus "betas"
    // (beta, beta.1, beta.2, etc.), and as build-identifiers "nightly".
    // This ensures that `semver.lt` will always work properly, indicating that
    // nightlies will never attempt to update to the same-but-older version:
    // semver.lt('4.0.0-beta+nightly', '4.0.0-beta' returns false).
    state.updateAvailable = semver.lt(localVersion, remoteVersion)

    // Adapt the rest of the state
    state.tagName = parsedResponse.tag_name
    // NOTE: We do not sanitize the HTML here. Instead we sanitize it in the
    // update window directly.
    state.changelog = await md2html(parsedResponse.body, {
      onCitation: (_c1, _c2) => undefined,
      zknLinkFormat: 'link|title'
    })
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
      const response = await ky(
        this._updateState.checksumFile.browser_download_url,
        { method: 'GET', timeout: 5000 }
      )

      // Now we need to parse the data. It looks like this:
      // [sha256 sum]  [binary name]
      // So we first need to split on newlines and then on spaces
      const contents = await response.text()
      contents
        .split('\n')
        .map(release => release.split(/\s+/))
        .filter(release => release.length === 2)
        .map(release => {
          this._logger.info(`[Update Provider] SHA256 checksum for ${release[1]}: ${release[0]}`)
          this._sha256Data.set(release[1], release[0])
        })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      throw new UpdateError('SHA_CHECKSUM_ERR', trans('Cannot retrieve SHA256 checksums: %s', message), { cause: err })
    }
  }

  /**
   * Download the given application update
   *
   * @param {string} url The URL to download
   */
  private async _downloadAppUpdate (url: string): Promise<void> {
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

    // Preset the appropriate values on the internal state
    this._updateState.name = updateToPull.name
    this._updateState.full_path = destination
    this._updateState.size_total = updateToPull.size
    this._updateState.size_downloaded = 0
    this._updateState.start_time = Date.now()
    this._updateState.eta_seconds = 0

    broadcastIpcMessage('update-provider', 'state-changed', this._updateState)

    // Initiate the transfer
    const response = await fetch(updateToPull.browser_download_url)
    if (!response.ok || response.body === null) {
      throw new Error('Could not download update!')
    }

    // The read stream reads the remote binary file, the write stream pipes that
    // data through to the local file.
    this._downloadWriteStream = createWriteStream(destination)

    this._downloadWriteStream.on('error', (err) => {
      this._cleanup(true)
      this._reportError('EWRITESTREAM', `Download Write Stream Error: ${err.message}`, true)
    })

    // We implement the progress callback as a transform that sits in between
    // the download stream and the write stream. It passes the data unchanged,
    // but inspects it to update the progress of the file download.
    const progress = new Transform({
      transform: (chunk, encoding, callback) => {
        const now = Date.now()
        this._updateState.size_downloaded += chunk.length
        const secondsPassed = (now - this._updateState.start_time) / 1000
        const bytesPerSecond = this._updateState.size_downloaded / secondsPassed
        const bytesRemaining = this._updateState.size_total - this._updateState.size_downloaded
        this._updateState.eta_seconds = Math.round(bytesRemaining / bytesPerSecond)
        broadcastIpcMessage('update-provider', 'state-changed', this._updateState)
        callback(null, chunk)
      }
    })

    // Begin downloading the binary data. The promise will resolve once the
    // readable stream has been fully drained and the write stream has ingested
    // all data and released the file pointer.
    await pipeline(
      // For reasons unbenknownst to me, after an update on Oct 17, 2026,
      // TypeScript started complaining that the response.body has the wrong
      // type. The code runs fine, but for this reason we have to manually cast
      // the response here to silence TypeScript. This will become superfluous
      // at some point in the future, so if you stumble upon this code, simply
      // remove the type cast, and see if TS still complains. If it doesn't,
      // please remove it (and this comment) again.
      response.body as unknown as PipelineSource<Uint8Array>,
      progress,
      this._downloadWriteStream
    )

    this._logger.info(`Successfully downloaded ${this._updateState.name}. Transferred ${this._updateState.size_downloaded} bytes overall.`)
    showNativeNotification(`Download of ${this._updateState.name} successful!`, 'Update', () => {
      // The user has clicked the notification, so we can show the update window here
      this._commands.run('open-update-window', undefined)
        .catch(e => this._logger.error(String(e.message), e))
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
    } catch (err: unknown) {
      this._cleanup(false)
      const message = err instanceof Error ? err.message : 'Unknown error'
      this._reportError('EOPEN', trans('Could not start update. Please retry or update manually. Error was: %s', message), true)
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
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        this._logger.warning(`[Update Provider] Could not close write stream: ${message}`, err)
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
      this.check().catch(err => {
        this._logger.error('[Update Provider] Could not check for updates: Unexpected error', err)
      })
    }, UPDATE_CHECK_INTERVAL)

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
