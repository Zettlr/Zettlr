/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PopupProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The popup provider offers a convenient way to display
 *                  popups across the application. You can call it using
 *                  the helper functions available on the global object.
 *
 * END HEADER
 */

const popup = require('./popup')
const isFunction = require('../../../common/util/is-function')

const POPUP_MODULES = {
  'export': require('../../../../resources/templates/popup/export.handlebars'),
  'file-info': require('../../../../resources/templates/popup/file-info.handlebars'),
  'find': require('../../../../resources/templates/popup/find.handlebars'),
  'footnote-edit': require('../../../../resources/templates/popup/footnote-edit.handlebars'),
  'format': require('../../../../resources/templates/popup/format.handlebars'),
  'icon-selector': require('../../../../resources/templates/popup/icon-selector.handlebars'),
  'pomodoro-settings': require('../../../../resources/templates/popup/pomodoro-settings.handlebars'),
  'pomodoro-status': require('../../../../resources/templates/popup/pomodoro-status.handlebars'),
  'stats': require('../../../../resources/templates/popup/stats.handlebars'),
  'table-of-contents': require('../../../../resources/templates/popup/table-of-contents.handlebars'),
  'table': require('../../../../resources/templates/popup/table.handlebars'),
  'target': require('../../../../resources/templates/popup/target.handlebars'),
  'textfield': require('../../../../resources/templates/popup/textfield.handlebars'),
  'update-progress': require('../../../../resources/templates/popup/update-progress.handlebars'),
  'update': require('../../../../resources/templates/popup/update.handlebars')
}

module.exports = class PopupProvider {
  constructor () {
    /**
     * The current popup instance, if any
     *
     * @var {Popup|null}
     */
    this._currentPopup = null
    /**
     * Holds the name of the currently shown template. Used to determine
     * triggers for the same popup.
     *
     * @var {string}
     */
    this._currentPopupName = ''

    /**
     * Contains the current popup's target. Used to determine whether to toggle
     * or replace the current popup.
     *
     * @var {Element|null}
     */
    this._currentPopupTarget = null

    // Inject global functions
    global.popupProvider = {
      /**
       * Shows the given popup
       *
       * @param   {String}    type             The popup type (i.e. template name)
       * @param   {Element}   element          The element to align the popup to
       * @param   {Object}    [data={}]        An object containing data for the template
       * @param   {Function}  [callback=null]  An optional callback
       *
       * @return  {Popup}                      The popup instance
       */
      show: (type, element, data = {}, callback = null) => {
        return this._createPopup(type, element, data, callback)
      },
      close: () => {
        console.log('Global close called')
        this._closePopup(true)
      }
    }
  }

  /**
   * Creates and shows a new popup.
   *
   * @param   {String}         type           The popup type (= template)
   * @param   {Element}        targetElement  The target element for the popup
   * @param   {Object}         data           Data to pass to the template
   * @param   {Function|null}  callback       Optional callback to call
   *
   * @return  {Popup|null}                   Either the popup instance, or null
   */
  _createPopup (type, targetElement, data, callback) {
    if (this._hasPopup()) {
      // Check if the popup appears to be a duplicate
      let sameName = type === this._currentPopupName
      let sameTarget = targetElement === this._currentPopupTarget

      // Then close the popup (resetting above this-variables)
      this._closePopup(true)

      if (sameName && sameTarget) {
        // Finally check if this has been a duplicate.
        // If so, do not instantiate a new one.
        // This resembles a "toggling" of duplicate popups.
        return null
      }
    }

    if (!POPUP_MODULES.hasOwnProperty(type)) {
      console.error(`There is no popup template type "${type}" available.`)
      return null
    }

    try {
      // Render the template, passing the data
      let popupContent = POPUP_MODULES[type](data)

      // Finally display the popup and save it to the various variables
      this._currentPopup = popup(targetElement, popupContent, (form) => {
        if (isFunction(callback)) {
          callback(form)
        }

        // Popup is closed --> clean up
        this._cleanup()
      })

      this._currentPopupName = type
      this._currentPopupTarget = targetElement

      // Return the popup instance so that the caller may hook into some
      // functions, e.g. to indicate a change in the popup's contents.
      return this._currentPopup
    } catch (error) {
      console.error(error)
      return null // No luck
    }
  }

  /**
   * Returns true, if a popup is currently being shown
   *
   * @return  {Boolean}  Whether a popup is shown.
   */
  _hasPopup () {
    return this._currentPopup !== null &&
      this._currentPopupName !== '' &&
      this._currentPopupTarget !== null
  }

  /**
   * Closes the current popup, if any
   *
   * @param {Boolean} force Whether to force-close the popup.
   */
  _closePopup (force = false) {
    if (this._currentPopup !== null) {
      this._currentPopup.close()
    }

    this._cleanup()
  }

  /**
   * Cleans up the internal variables to indicate no popup is open
   */
  _cleanup () {
    this._currentPopup = null
    this._currentPopupTarget = null
    this._currentPopupName = ''
  }
}
