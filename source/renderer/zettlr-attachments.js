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

    this.refresh()

    this._act() // Activate both the directory toggle and the link
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
        let link = $('<a>').text(a.name)
          .attr('data-link', a.path)
          .attr('data-hash', a.hash)
          .attr('title', a.path) // Make sure the user can always see the full title
          .attr('href', a.path) // Necessary for native drag&drop functionality
        this._fileContainer.append(link)
      }
    }
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
    $('#attachments').on('click', 'a', (e) => {
      let elem = $(e.target)
      if (elem.attr('data-link')) shell.openItem(elem.attr('data-link'))
      e.preventDefault() // Don't follow the link
      e.stopPropagation()
    })

    $('#attachments #open-dir-external').click((e) => {
      if (this._renderer.getCurrentDir()) {
        shell.openItem(this._renderer.getCurrentDir().path)
      }
    })
  }
}

module.exports = ZettlrAttachments
