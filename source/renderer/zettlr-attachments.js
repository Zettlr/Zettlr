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

class ZettlrAttachments {
  /**
    * Create and append the attachment pane.
    * @param {ZettlrRenderer} parent The renderer.
    */
  constructor (parent) {
    this._renderer = parent
    this._container = $('<div>').prop('id', 'attachments')
    $('body').append(this._container)
    this._open = false
    this._attachments = []

    this.refresh()
  }

  /**
    * Shows/hides the pane.
    */
  toggle () {
    // Toggles the display of the attachment pane
    if (!this._open) {
      this._container.animate({ 'right': '0%' })
    } else {
      this._container.animate({ 'right': '-20%' })
    }

    this._open = !this._open
  }

  /**
    * Refreshes the list with new attachments on dir change.
    */
  refresh () {
    this._container.html(`<h1>${trans('gui.attachments')} <small id="open-dir-external" title="${trans('gui.attachments_open_dir')}">&#xf332;</small></h1>`)
    // Grab the newest attachments and refresh
    if (!this._renderer.getCurrentDir()) {
      this._container.append($('<p>').text(trans('gui.no_attachments')))
      return // Don't activate in this instance
    }

    if (this._renderer.getCurrentDir().attachments.length === 0) {
      this._container.append($('<p>').text(trans('gui.no_attachments')))
    } else {
      this._attachments = this._renderer.getCurrentDir().attachments
      for (let a of this._attachments) {
        this._container.append($('<a>').text(a.name).attr('href', '#').attr('data-hash', a.hash))
      }
    }

    this._act() // Activate both the directory toggle and the link
  }

  /**
    * Activates the event listeners on the attachment pane.
    */
  _act () {
    $('#attachments a').click((e) => {
      let elem = $(e.target)
      for (let a of this._attachments) {
        if (a.hash === parseInt(elem.attr('data-hash'))) {
          shell.openItem(a.path)
          break
        }
      }
    })

    $('#attachments #open-dir-external').click((e) => {
      if (this._renderer.getCurrentDir()) {
        shell.openItem(this._renderer.getCurrentDir().path)
      }
    })
  }
}

module.exports = ZettlrAttachments
