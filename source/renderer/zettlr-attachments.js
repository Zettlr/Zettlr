/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrAttachments class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays the attachments of the current directory.
 *
 * END HEADER
 */

const { shell } = require('electron')

const { trans } = require('../common/lang/i18n.js')

/**
  * Handles both display of files in the attachment sidebar and the list of
  * references, if applicable.
  * @param {ZettlrRenderer} parent The renderer.
  */
class ZettlrAttachments {
  constructor (parent) {
    this._renderer = parent
    this._container = $('<div>').prop('id', 'attachments').css('display', 'none')
    this._container.html(`<h1>${trans('gui.attachments')} <small id="open-dir-external" title="${trans('gui.attachments_open_dir')}">&#xf332;</small></h1>`)
    this._fileContainer = $('<div>').prop('id', 'files')
    this._bibliographyContainer = $('<div>').prop('id', 'bibliography')
    this._container.append(this._fileContainer)
    this._container.append($('<h1>').text(trans('gui.citeproc.references_heading')))
    this._container.append(this._bibliographyContainer)
    $('body').append(this._container)
    this._open = false
    this._attachments = []

    // We cannot activate the event listener for the directory opening button
    // in the act method, because the act method gets called everytime the user
    // changes the directory. Therefore, we would bind a new event listener
    // every time the user switches directories. This leads to unnecessary lags
    // an macOS and Windows, and may open the exact amount of new file explorer
    // windows on Linux distributions (see issue #87).
    $('#attachments #open-dir-external').click((e) => {
      if (this._renderer.getCurrentDir()) {
        shell.openItem(this._renderer.getCurrentDir().path)
      }
    })

    this.refresh()
  }

  /**
    * Shows/hides the pane.
    */
  toggle () {
    // Toggles the display of the attachment pane
    if (!this._open) {
      this._container.css('display', '')
      this._container.animate({ 'right': '0%' })
    } else {
      this._container.animate({ 'right': '-20%' }, () => {
        this._container.css('display', 'none')
      })
    }

    this._open = !this._open
  }

  /**
    * Refreshes the list with new attachments on dir change.
    */
  refresh () {
    this._fileContainer.text('')
    // Grab the newest attachments and refresh
    if (!this._renderer.getCurrentDir()) {
      this._fileContainer.append($('<p>').text(trans('gui.no_attachments')))
      return // Don't activate in this instance
    }

    if (this._renderer.getCurrentDir().attachments.length === 0) {
      this._fileContainer.append($('<p>').text(trans('gui.no_attachments')))
    } else {
      this._attachments = this._renderer.getCurrentDir().attachments
      for (let a of this._attachments) {
        this._fileContainer.append($('<a>').text(a.name).attr('href', a.path).attr('data-hash', a.hash))
      }
    }

    this._act() // Activate both the directory toggle and the link
  }

  /**
   * This function refreshes the bibliography settings.
   * @param  {Mixed} bib Either an array as returned from citeproc, or a string.
   * @return {void}     This does not return.
   */
  refreshBibliography (bib) {
    if (typeof bib === 'string') this._bibliographyContainer.html(`<p>${bib}</p>`)
    else this._bibliographyContainer.html(bib[0].bibstart + bib[1].join('\n') + bib[0].bibend)
  }

  /**
    * Activates the event listeners on the attachment pane.
    */
  _act () {
    $('#attachments a').click((e) => {
      let elem = $(e.target)
      if (elem.attr('href')) shell.openItem(elem.attr('href'))
      e.preventDefault() // Don't follow the link
      e.stopPropagation()
    })
  }
}

module.exports = ZettlrAttachments
