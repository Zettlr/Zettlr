/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateDialog class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     If there's a new update, this dialog lets you download it.
 *
 * END HEADER
 */

const GettlrDialog = require('./gettlr-dialog.js')

class UpdateDialog extends GettlrDialog {
  constructor () {
    super()
    this._dialog = 'update'
  }

  preInit (data) {
    let matomoData = '?pk_campaign=RecurringUsers&pk_source=app&pk_medium=GettlrUpdater'
    data.downloadLink = 'https://www.Gettlr.com/download/' + matomoData
    if ($('body').hasClass('darwin')) {
      data.downloadLink = 'https://www.Gettlr.com/download/macos' + matomoData
    } else if ($('body').hasClass('win32')) {
      data.downloadLink = 'https://www.Gettlr.com/download/win32' + matomoData
    } else if ($('body').hasClass('linux')) {
      data.downloadLink = 'https://www.Gettlr.com/download/linux' + matomoData
    }

    // In case we've got a beta release, provide the release URL at GitHub, as
    // the Gettlr homepage won't spit out beta releases.
    if (data.isBeta) data.downloadLink = data.releaseURL

    return data
  }
}

module.exports = UpdateDialog
