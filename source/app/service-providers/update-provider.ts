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
  ReadStream,
  WriteStream
} from 'fs'

import path from 'path'
import crypto from 'crypto'
import got, { Response } from 'got'
import semver from 'semver'
import md2html from '../../common/util/md-to-html'

import { ipcMain, app, shell } from 'electron'
import { trans } from '../../common/i18n-main'
import isFile from '../../common/util/is-file'

const CUR_VER = app.getVersion()
const REPO_URL = 'https://zettlr.com/api/releases/latest'

// Mimicks the API response for a downloadable asset
interface UpdateAsset {
  name: string
  size: number
  browser_download_url: string
}

interface SHAInfo {
  name: string
  sha256: string
}

// Mimicks the API response for an update check
interface ServerAPIResponse {
  id: number
  tag_name: string
  name: string
  prerelease: boolean
  html_url: string
  body: string
  published_at: string
  assets: UpdateAsset[]
}

export default class UpdateProvider {
  private _lastResponse: null|ParsedAPIResponse
  private _sha256Data: SHAInfo[]
  private _downloadProgress: UpdateDownloadProgress
  private _downloadReadStream: undefined|ReadStream
  private _downloadWriteStream: undefined|WriteStream
  constructor () {
    global.log.verbose('Update provider booting up ...')

    this._lastResponse = null // The parsed last response
    this._sha256Data = [] // The SHA 256 checksums for the installers

    this._downloadProgress = {
      name: '',
      full_path: '',
      size_total: 0,
      size_downloaded: 0,
      start_time: 0,
      eta_seconds: 0,
      download_percent: 0,
      finished: false,
      isCurrentlyDownloading: false
    }

    this._downloadReadStream = undefined // During download contains the read stream
    this._downloadWriteStream = undefined // During download contains the write stream

    // Inject the global provider functions
    global.updates = {
      /**
       * Initiate a new update check
       *
       * @return  {void}
       */
      check: () => {
        global.log.info('[Update Provider] Checking for application updates ...')
        this._check().then(() => {
          if (this._lastResponse === null) {
            global.log.warning('[Update Provider] No response after the update check!')
            return
          }

          if (this._lastResponse.isNewer) {
            global.log.info(`[Update Provider] Update available: ${this._lastResponse.newVer}`)
            global.notify.normal(trans('dialog.update.new_update_available', this._lastResponse.newVer), () => {
              // The user has clicked the notification, so we can show the update window here
              global.application.runCommand('open-update-window')
                .catch(e => global.log.error(String(e.message), e))
            })
          } else {
            global.notify.normal(trans('dialog.update.no_new_update'))
          }
        }).catch((err) => {
          global.log.error(`[Update Provider] Error during update check: ${err.message as string}`, err)
        })
      },
      /**
       * Checks if there is a new update available. Must be called after check()
       *
       * @return  {Boolean}  True, if the last update check retrieved a newer version
       */
      applicationUpdateAvailable: () => {
        if (this._lastResponse !== null) {
          return this._lastResponse.isNewer
        } else {
          return false
        }
      }
    }

    // Handle events
    ipcMain.handle('update-provider', async (event, data) => {
      let { command, payload } = data

      if (command === 'update-check' && global.updates.applicationUpdateAvailable()) {
        // TODO: Is this event really necessary?
        await this._check()
        return this._lastResponse
      } else if (command === 'update-status') {
        // Just provide the caller with our response
        return this._lastResponse
      } else if (command === 'request-app-update') {
        // We shall download the URL which is in the content variable
        global.log.info('[Update Provider] Requesting update ' + (payload as string))
        this._downloadAppUpdate(payload)
      } else if (command === 'download-progress') {
        return this._downloadProgress
      } else if (command === 'begin-update') {
        // Begin the actual update process NOTE We're not blocking the handler
        await this._beginUpdate()
          .catch(e => {
            global.log.error(`[Update Provider] Unexpected error during update process: ${e.message as string}`, e)
          })
        return true
      }
    })
  }

  /**
   * Runs a query to the GitHub API for new versions
   * @return {Promise} Resolves only when there is an update available.
   */
  async _check (): Promise<void> {
    try {
      global.log.info(`[Updater] Checking ${REPO_URL} for updates ...`)
      const response: Response<string> = await got(REPO_URL, {
        method: 'GET',
        searchParams: new URLSearchParams([
          [ 'accept-beta', global.config.get('checkForBeta') ]
        ])
      })

      // Next: Parse the result
      return await this._parseResponse(response)
    } catch (err: any) {
      // Determine the error
      let notFoundError = err.code === 'ENOTFOUND'
      // If we have an ENOTFOUND error there is no response and no statusCode
      // so we'll use TypeScript shortcuts to save us from ugly errors.
      let serverError = err?.response?.statusCode >= 500
      let clientError = err?.response?.statusCode >= 400
      let redirectError = err?.response?.statusCode >= 300

      // Give a more detailed error message
      if (serverError) {
        throw new Error(trans('dialog.update.server_error', err.response.statusCode))
      } else if (clientError) {
        throw new Error(trans('dialog.update.client_error', err.response.statusCode))
      } else if (redirectError) {
        throw new Error(trans('dialog.update.redirect_error', err.response.statusCode))
      } else if (notFoundError) {
        // getaddrinfo has reported that the host has not been found.
        // This normally only happens if the networking interface is
        // offline.
        throw new Error(trans('dialog.update.connection_error'))
      } else {
        // Something else has occurred.
        // GotError objects have a name property.
        throw new Error(trans('dialog.update.other_error', err.name, err.message))
      }
    }
  }

  /**
   * Parses the response body as given in this._response and returns update data,
   * if applicable.
   * @param {Object} response The response from the server
   */
  async _parseResponse (response: Response<string>): Promise<void> {
    // Error handling
    if (response.body.trim() === '') {
      global.log.warning('[Update Provider] Cannot parse server response: empty.')
      throw new Error(trans('dialog.update.no_data'))
    }

    // First we need to parse the JSON data.
    const parsedResponse: ServerAPIResponse = JSON.parse(response.body)

    // Populate the last response
    this._lastResponse = {
      newVer: parsedResponse.tag_name,
      curVer: CUR_VER,
      isNewer: semver.lt(CUR_VER, parsedResponse.tag_name),
      // Make sure we got the changelog as HTML
      changelog: md2html(parsedResponse.body),
      releaseURL: parsedResponse.html_url,
      isBeta: parsedResponse.prerelease,
      assets: parsedResponse.assets.filter((asset) => {
        // Filter out the assets unusable on the current platform.
        switch (process.platform) {
          case 'darwin':
            // We provide a DMG image for macOS (x64 and arm64)
            return /\.dmg$/.test(asset.name)
          case 'win32':
            // We provide EXE-installers for both ARM and intel
            return /\.exe$/.test(asset.name)
          default:
            // As we cannot differentiate between different linux versions,
            // we simply include anything not satisfied by the above regular
            // expressions.
            return !/\.dmg$|\.exe$/.test(asset.name)
        }
      }),
      // We can check the checksum after download to make it extra secure!
      sha256Asset: parsedResponse.assets.find((asset) => {
        return asset.name === 'SHA256SUMS.txt'
      })
    }

    if (this._lastResponse.isNewer) {
      global.log.info(`[Update Provider] New update available! Please update to ${this._lastResponse.newVer} soon!`)
    } else {
      global.log.info(`[Update Provider] No new update available. Current version is ${this._lastResponse.newVer}.`)
    }
  }

  /**
   * Download the given application update
   * @param {string} url The URL to download
   */
  _downloadAppUpdate (url: string): void {
    if (this._lastResponse === null) {
      global.log.error('[Update Provider] Cannot download application update: no last response from the server.')
      return
    }

    // First, let's find the update
    let updateToPull = this._lastResponse.assets.find((elem) => {
      return elem.browser_download_url === url
    })

    if (updateToPull === undefined) {
      global.log.error(`[Update Provider] Could not download update ${url}: URL is not in assets`)
      return
    }

    // Save to downloads folder
    let destination = path.join(app.getPath('downloads'), updateToPull.name)

    // The read stream reads the remote binary file, the write stream pipes that
    // data through to the local file.
    this._downloadWriteStream = createWriteStream(destination)
    this._downloadReadStream = got.stream(updateToPull.browser_download_url) as unknown as ReadStream

    // Preset the appropriate values on the download progress object
    this._downloadProgress = {
      name: updateToPull.name,
      full_path: destination,
      size_total: updateToPull.size,
      size_downloaded: 0,
      start_time: Date.now(),
      eta_seconds: 0,
      download_percent: 0,
      finished: false,
      isCurrentlyDownloading: true
    }

    this._downloadReadStream.on('data', (chunk: Buffer) => {
      if (this._downloadWriteStream === undefined) {
        global.log.error('[Update Provider] Could not accept data for application update: Write stream is gone.')
        this._cleanup(true)
        return
      }

      let now = Date.now()
      this._downloadProgress.size_downloaded += chunk.length
      let secondsPassed = (now - this._downloadProgress.start_time) / 1000
      let bytesPerSecond = this._downloadProgress.size_downloaded / secondsPassed
      let bytesRemaining = this._downloadProgress.size_total - this._downloadProgress.size_downloaded
      this._downloadProgress.eta_seconds = Math.round(bytesRemaining / bytesPerSecond)
      // Multiply by ten thousand: 0.134963 --> 1349.63
      let percent = this._downloadProgress.size_downloaded / this._downloadProgress.size_total * 10000
      // Round: 1349.63 --> 1349
      percent = Math.round(percent)
      // Divide by 100: 1349 --> 13.49
      this._downloadProgress.download_percent = percent / 100
      this._downloadWriteStream.write(chunk)
    })

    this._downloadReadStream.on('end', () => {
      global.log.info(`Successfully downloaded ${this._downloadProgress.name}. Transferred ${this._downloadProgress.size_downloaded} bytes overall.`)
      global.notify.normal(`Download of ${this._downloadProgress.name} successful!`, () => {
        // The user has clicked the notification, so we can show the update window here
        global.application.runCommand('open-update-window')
          .catch(e => global.log.error(String(e.message), e))
      })

      this._downloadProgress.finished = true
      // Also, clean up, but don't remove the file
      this._cleanup()
    })

    this._downloadReadStream.on('error', (err) => {
      global.log.error(`[Update Provider] Download Read Stream Error: ${err.message}`, err)
      this._cleanup(true)
    })

    this._downloadWriteStream.on('error', (err) => {
      global.log.error(`[Update Provider] Download Write Stream Error: ${err.message}`, err)
      this._cleanup(true)
    })
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
        global.log.warning(`[Update Provider] Could not close write stream: ${err.message as string}`, err)
      }
      this._downloadWriteStream = undefined
    }
    // Second the read stream
    if (this._downloadReadStream !== undefined) {
      try {
        this._downloadReadStream.close()
      } catch (err: any) {
        global.log.warning(`[Update Provider] Could not close read stream: ${err.message as string}`, err)
      }
      this._downloadWriteStream = undefined
    }

    // Indicate we're not downloading right now
    this._downloadProgress.isCurrentlyDownloading = false

    if (!unlinkFile || !isFile(this._downloadProgress.full_path)) {
      return
    }

    // We shall also unlink the file
    fs.unlink(this._downloadProgress.full_path)
      .catch(e => {
        global.log.error(`[Update Provider] Could not remove partial download file ${this._downloadProgress.full_path}.`, e)
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
    global.notify.normal('Verifying update ...')
    let res = await this._retrieveSHA256Sums()
    if (!res) {
      this._cleanup(true)
      global.notify.normal('Could not verify the download!')
      return
    }

    const correctSHA = this._sha256Data.find((release) => {
      return release.name === this._downloadProgress.name
    })

    if (correctSHA === undefined) {
      this._cleanup(true)
      global.log.error('[Update Provider] Could not verify checksums: No corresponding SHA256 found in data.')
      global.notify.normal('Could not verify the download!')
      return
    }

    let sha256sum = crypto.createHash('sha256')
    const fileContents = await fs.readFile(this._downloadProgress.full_path)
    sha256sum.update(fileContents)
    const downloadSHA = sha256sum.digest('hex')
    if (downloadSHA !== correctSHA.sha256) {
      this._cleanup(true)
      global.log.error(`[Update Provider] The SHA256 checksums did not match. Expected ${correctSHA.sha256}, but got ${downloadSHA}.`)
      global.notify.normal('Could not verify update. Aborting update process!')
      return
    } else {
      global.log.info(`[Update Provider] Successfully verified the checksum of ${this._downloadProgress.name} (${downloadSHA})!`)
    }

    // Then launch the file and immediately quit the app.
    try {
      await shell.openPath(this._downloadProgress.full_path)
      app.quit()
    } catch (err: any) {
      global.notify.normal('Could not start update. Please install manually.')
      global.log.error(`[Update Provider] Could not start update: ${err.message as string}.`, err)
    }
  }

  /**
   * Attempts to download and parse the SHA 256 sums for the releases
   *
   * @return {boolean} The success or failure of the operation
   */
  async _retrieveSHA256Sums (): Promise<boolean> {
    if (this._lastResponse?.sha256Asset === undefined) {
      global.log.error('[Update Provider] Cannot verify SHA256 checksum of the downloaded installer: No checksum file found!')
      return false
    }

    // Let's download the SHA256 data as well
    try {
      let response = await got(
        this._lastResponse.sha256Asset.browser_download_url,
        { method: 'GET' }
      )

      // Now we need to parse the data. It looks like this:
      // [sha256 sum]  [binary name]
      // So we first need to split on newlines
      const checksums: string[] = response.body.split('\n')
      // Now we need to split on spaces
      let releases: SHAInfo[] = []
      checksums.forEach(release => {
        let releaseInfo = release.split(/\s+/)
        if (releaseInfo.length !== 2) return
        releases.push({
          name: releaseInfo[1],
          sha256: releaseInfo[0]
        })
      })

      this._sha256Data = releases
      return true
    } catch (err) {
      global.log.error('[Update Provider] Could not download the SHA256 data for the new release', err)
      return false
    }
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  async shutdown (): Promise<boolean> {
    global.log.verbose('Update provider shutting down ...')
    // We'll be removing the file IF and only IF the download was not finished.
    this._cleanup(!this._downloadProgress.finished)
    return true
  }
}
