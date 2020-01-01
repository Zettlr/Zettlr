/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateCheck command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command performs an update check.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const got = require('got')
const semver = require('semver')
const showdown = require('showdown')

const { trans } = require('../../common/lang/i18n.js')

const REPO_URL = require('../../common/data.json').repo_url
const CUR_VER = require('../../package.json').version

class UpdateCheck extends ZettlrCommand {
  constructor (app) {
    super(app, 'update-check')
    this._response = ''
  }

  /**
   * Runs an update check and either notifies the user that there's no update,
   * or transmits the update data.
   * @param {String} evt The event name
   * @param {Object} arg The arguments.
   * @return {Boolean} Always true, as long as we can't make these things async.
   */
  run (evt, arg) {
    this._check().then((res) => {
      this._app.ipc.send('update-available', res)
    }).catch((e) => global.ipc.notify(e.message))
    return true
  }

  /**
   * Runs a query to the GitHub API for new versions
   * @return {Promise} Resolves only when there is an update available.
   */
  async _check () {
    try {
      this._response = await got(REPO_URL, {
        method: 'GET',
        searchParams: new URLSearchParams([
          [ 'uuid', global.config.get('uuid') ],
          [ 'accept-beta', global.config.get('checkForBeta') ],
          [ 'platform', process.platform ],
          [ 'version', CUR_VER ]
        ]).toString()
      })
      // Alright, we only need the body
      this._response = this._response.body
    } catch (error) {
      // Determine the error
      let serverError = error.response && error.response.statusCode >= 500
      let clientError = error.response && error.response.statusCode >= 500
      let redirectError = error.response && error.response.statusCode >= 500
      let notFoundError = !error.response && error.code === 'ENOTFOUND'

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

    // Next: Parse the result
    return this._parseResponse()
  }

  /**
   * Parses the response body as given in this._response and returns update data,
   * if applicable.
   * @return {Object} The new update data.
   */
  _parseResponse () {
    // Error handling
    if (this._response.trim() === '') throw new Error(trans('dialog.update.no_data'))

    // First we need to deal with it.
    this._response = JSON.parse(this._response)

    // Check if (1) our app is less than the current best version.
    if (semver.lt(CUR_VER, this._response.tag_name)) {
      let conv = new showdown.Converter({ 'headerLevelStart': 2 })
      conv.setFlavor('github')
      let html = conv.makeHtml(this._response.body)

      // Convert links, so that they remain but do not open in the same
      // window. Security fallback: target="_blank" (then at least they "only"
      // open a new window)
      let aRE = /<a(.+?)>(.*?)<\/a>/g
      html = html.replace(aRE, function (match, p1, p2, offset, string) {
        return `<a${p1} onclick="require('electron').shell.openExternal(this.getAttribute('href')); return false;" target="_blank">${p2}</a>`
      })

      return {
        'newVer': this._response.tag_name,
        'curVer': CUR_VER,
        'changelog': html,
        'releaseURL': this._response.html_url,
        'isBeta': this._response.prerelease,
        'downloadURL': ''
      }
    } else {
      throw new Error(trans('dialog.update.no_update'))
    }
  }
}

module.exports = UpdateCheck
