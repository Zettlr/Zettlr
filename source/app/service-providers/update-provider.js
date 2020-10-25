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

const { createWriteStream } = require('fs')
const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const got = require('got')
const semver = require('semver')
const showdown = require('showdown')

const { ipcMain, app, shell } = require('electron')

const { trans } = require('../../common/lang/i18n.js')

const REPO_URL = require('../../common/data.json').repo_url
const CUR_VER = require('electron').app.getVersion()

module.exports = class UpdateProvider {
  constructor () {
    global.log.verbose('Update provider booting up ...')

    this._lastResponse = null // The parsed last response
    this._lastError = null // In case there was an error
    this._sha256Data = undefined // The SHA 256 checksums for the installers
    this._downloadProgress = undefined // Can contain download progress information
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
        this._check().then(() => {
          /* Nothing to do */
        }).catch((err) => {
          this._lastError = err
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
      },
      /**
       * Retrieves the parsed application update data
       *
       * @return  {Object}  The update data
       */
      getApplicationUpdateData: () => {
        return Object.assign({}, this._lastResponse)
      }
    }

    ipcMain.on('update-provider', (event, data) => {
      let { command, content } = data

      if (command === 'update-check' && global.updates.applicationUpdateAvailable()) {
        event.sender.webContents.send('update-provider', {
          'command': 'update-data',
          'content': this._lastResponse
        })
      } else if (command === 'request-app-update') {
        // We shall download the URL which is in the content variable
        global.log.info('Requesting update ' + content)
        this._downloadAppUpdate(content)
      } else if (command === 'download-progress') {
        event.sender.webContents.send('update-provider', {
          'command': 'download-progress',
          'content': this._downloadProgress
        })
      } else if (command === 'begin-update') {
        // Begin the actual update process
        this._beginUpdate()
      }
    })
  }

  /**
   * Runs a query to the GitHub API for new versions
   * @return {Promise} Resolves only when there is an update available.
   */
  async _check () {
    try {
      const response = await got(REPO_URL, {
        method: 'GET',
        searchParams: new URLSearchParams([
          [ 'uuid', global.config.get('uuid') ],
          [ 'accept-beta', global.config.get('checkForBeta') ],
          [ 'platform', process.platform ],
          [ 'version', CUR_VER ]
        ]).toString()
      })

      // Next: Parse the result
      return this._parseResponse(response.body)
    } catch (error) {
      // Determine the error
      let serverError = error.response.statusCode >= 500
      let clientError = error.response.statusCode >= 400
      let redirectError = error.response.statusCode >= 300
      let notFoundError = error.code === 'ENOTFOUND'

      // Give a more detailed error message
      if (serverError) {
        throw new Error(trans('dialog.update.server_error', error.response.statusCode))
      } else if (clientError) {
        throw new Error(trans('dialog.update.client_error', error.response.statusCode))
      } else if (redirectError) {
        throw new Error(trans('dialog.update.redirect_error', error.response.statusCode))
      } else if (notFoundError) {
        // getaddrinfo has reported that the host has not been found.
        // This normally only happens if the networking interface is
        // offline.
        throw new Error(trans('dialog.update.connection_error'))
      } else {
        // Something else has occurred. TODO: Translate!
        // GotError objects have a name property.
        throw new Error(`Could not check for updates. ${error.name}: ${error.message}`)
      }
    }
  }

  /**
   * Parses the response body as given in this._response and returns update data,
   * if applicable.
   * @param {Object} response The response from the server
   */
  async _parseResponse (response) {
    // Error handling
    if (response.trim() === '') throw new Error(trans('dialog.update.no_data'))

    // First we need to parse the JSON data.
    response = JSON.parse(response)

    let conv = new showdown.Converter({ 'headerLevelStart': 2 })
    conv.setFlavor('github')
    let html = conv.makeHtml(response.body)

    // Convert links, so that they remain but do not open in the same
    // window. Security fallback: target="_blank" (then at least they "only"
    // open a new window)
    const aRE = /<a\s+(.+?)>(.*?)<\/a>/g
    html = html.replace(aRE, function (match, p1, p2, offset, string) {
      return `<a${p1} onclick="require('electron').shell.openExternal(this.getAttribute('href')); return false;" target="_blank">${p2}</a>`
    })

    this._lastResponse = {
      'newVer': response.tag_name,
      'curVer': CUR_VER,
      'isNewer': semver.lt(CUR_VER, response.tag_name),
      'changelog': html,
      'releaseURL': response.html_url,
      'isBeta': response.prerelease,
      'assets': response.assets.filter((asset) => {
        // Filter out the assets unusable on the current platform.
        // Each asset has the properties "name", "size", and "brower_download_url"
        switch (process.platform) {
          case 'darwin':
            // We provide a DMG image for macOS
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
      // TODO: We can check the checksum after download to make it extra secure!
      'sha256Url': response.assets.find((asset) => {
        return asset.name === 'SHA256SUMS.txt'
      })
    }
  }

  _downloadAppUpdate (url) {
    // First, let's find the update
    let updateToPull = this._lastResponse.assets.find((elem) => {
      return elem.browser_download_url === url
    })

    if (updateToPull === null) {
      global.log.error(`Could not download update ${url}: URL is not in assets`)
      return
    }

    // Save to downloads folder
    let destination = path.join(app.getPath('downloads'), path.basename(updateToPull.browser_download_url))

    this._downloadWriteStream = createWriteStream(destination)
    this._downloadReadStream = got.stream(updateToPull.browser_download_url)

    this._downloadProgress = {
      'name': updateToPull.name,
      'full_path': destination,
      'size_total': parseInt(updateToPull.size),
      'size_downloaded': 0,
      'start_time': Date.now(),
      'eta_seconds': 0,
      'download_percent': 0,
      'finished': false
    }

    this._downloadReadStream.on('data', (chunk) => {
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
      global.ipc.notify(`Download of ${this._downloadProgress.name} successful!`)
      this._downloadProgress.finished = true
      this._downloadWriteStream.close()
      this._downloadWriteStream = undefined
    })

    this._downloadReadStream.on('error', (err) => {
      global.log.error(`Could not download update ${this._downloadProgress.name}: ${err.message}`, err)
      this._downloadWriteStream.close()
      this._downloadWriteStream = undefined
      this._downloadProgress = undefined
      fs.unlink(this._downloadProgress.full_path)
    })

    this._downloadWriteStream.on('error', (err) => {
      global.log.error(`Could not download update ${this._downloadProgress.name}: ${err.message}`, err)
      try {
        this._downloadReadStream.close()
      } catch (err) {
        global.log.error(`Error closing read stream: ${err.message}`, err)
      }
      this._downloadReadStream = undefined
      this._downloadProgress = undefined
      fs.unlink(this._downloadProgress.full_path)
    })
  }

  async _beginUpdate () {
    // What this function does:
    // 1. Download the SHA checksums
    // 2. Check that the file is correct
    // 3. Launch the file
    // 4. Quit the app
    global.ipc.notify('Verifying update ...')
    let res = await this._retrieveSHA256Sums()
    if (!res) {
      await fs.unlink(this._downloadProgress.full_path)
      return global.ipc.notify('Could not download the checksums to verify download. Aborting update process!')
    }

    const correctSHA = this._sha256Data.find((release) => {
      return release.name === this._downloadProgress.name
    })

    let sha256sum = crypto.createHash('sha256')
    const fileContents = await fs.readFile(this._downloadProgress.full_path)
    sha256sum.update(fileContents)
    const downloadSHA = sha256sum.digest('hex')
    if (downloadSHA !== correctSHA.sha256) {
      global.log.error(`The SHA256 checksums did not match. Expected ${correctSHA.sha256}, but got ${downloadSHA}`)
      await fs.unlink(this._downloadProgress.full_path)
      return global.ipc.notify('Could not verify update. Aborting update process!')
    } else {
      global.log.info(`Successfully verified the checksum of ${this._downloadProgress.name} (${downloadSHA})!`)
    }

    // Then launch the file and immediately quit the app.
    try {
      await shell.openPath(this._downloadProgress.full_path)
      app.quit()
    } catch (err) {
      global.ipc.notify('Could not start update. Please install manually.')
      global.log.error('Could not start update: ' + err.message, err)
    }
  }

  /**
   * Attempts to download and parse the SHA 256 sums for the releases
   *
   * @return {boolean} The success or failure of the operation
   */
  async _retrieveSHA256Sums () {
    if (this._lastResponse.sha256Url === undefined) return false

    // Let's download the SHA256 data as well
    try {
      let response = await got(
        this._lastResponse.sha256Url.browser_download_url,
        { method: 'GET' }
      )

      let data = response.body
      // Now we need to parse the data. It looks like this:
      // [sha256 sum]  [binary name]
      // So we first need to split on newlines
      data = data.split('\n')
      // Now we need to split on spaces
      let releases = []
      data.forEach(release => {
        let releaseInfo = release.split(/\s+/)
        if (releaseInfo.length !== 2) return
        releases.push({
          'name': releaseInfo[1],
          'sha256': releaseInfo[0]
        })
      })
      this._sha256Data = releases
      return true
    } catch (error) {
      global.log.error('Could not download the SHA256 data for the new release', error)
      return false
    }
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  async shutdown () {
    global.log.verbose('Update provider shutting down ...')
    // Remove a partial download, if applicable
    if (this._downloadProgress !== undefined && !this._downloadProgress.finished) {
      // Closing the read stream will automatically close the write stream in the callback
      try {
        this._downloadReadStream.close()
      } catch (err) {
        global.log.error('Could not close read/write stream: ' + err.message, err)
      }
      global.log.info('Removing unfinished application update file ...')
      await fs.unlink(this._downloadProgress.full_path)
    }
    return true
  }
}
