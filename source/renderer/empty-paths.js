/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        EmptyPaths class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class creates a message that is displayed when the tree
 *                  is empty.
 *
 * END HEADER
 */

const { trans } = require('../common/lang/i18n.js')

/**
 * Simply handles a small no-roots-open-message.
 */
class EmptyPaths {
  /**
    * Create the div.
    * @param {ZettlrDirectories} dirobj The directory container
    */
  constructor (dirobj) {
    this._directories = dirobj
    this._container = $('<div>').addClass('emptyPaths')
    this._container.append($('<div>').addClass('info').text(trans('gui.empty_directories')))
  }

  /**
    * Shows the message
    */
  show () {
    this._directories.getContainer().append(this._container)
    this._container.click((e) => {
      this._directories.getRenderer().send('dir-open')
    })
  }

  /**
    * Hides the message
    */
  hide () {
    this._container.detach()
  }
}

module.exports = EmptyPaths
