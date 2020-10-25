/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDialog class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the base class which enables other instances to
 *                  expand upon for displaying sophisticated dialogs.
 *
 * END HEADER
 */

const tippy = require('tippy.js').default
const EventEmitter = require('events')
const { clipboard } = require('electron')
const { trans } = require('../../common/lang/i18n.js')
require('jquery-ui/ui/unique-id')
require('jquery-ui/ui/widget')
require('jquery-ui/ui/widgets/tabs')

/**
 * This class definitely needs a revamp, because it is not self-sustaining but
 * relies to a mind-boggling extent on functionality and assumptions about the
 * ZettlrBody-class. While in the early days of Zettlr, this class's task was to
 * provide windows for everything (even renaming files or creating new), with
 * the advent of the ZettlrPopup class, most of the functionality went there.
 * What has remained is the Preferences window. What will, in the future, be
 * added, is the About window. And maybe something else. But as I said, first,
 * it needs a revamp.
 */
class ZettlrDialog extends EventEmitter {
  /**
    * Prepare the dialog
    */
  constructor () {
    super()
    if (document.getElementById('zettlr-modal') !== null) {
      throw new Error('Could not create dialog: There is already a dialog open!')
    }

    // Used to retrieve some configuration options
    this._container = document.getElementById('container')
    this._modal = document.createElement('div')
    this._modal.classList.add('modal')
    this._modal.setAttribute('id', 'zettlr-modal')
    this._dialog = null // Must be overwritten by extension dialogs.
    this._statsData = []
    this._statsLabels = []
    this._placeCallback = (event) => { this._place() }
  }

  /**
    * Opens a dialog after it has been initialized
    * @return {ZettlrDialog} Chainability.
    */
  open () {
    if (!this.isInitialized()) {
      throw new Error(trans('dialog.error.no_init'))
    }

    // Blur the background
    this._container.classList.add('blur')
    document.body.appendChild(this._modal)

    // Activate event listeners
    return this._act()
  }

  /**
    * Place the dialog in the middle of the screen
    */
  _place () {
    // Adjust the margins
    let dialog = this._modal.querySelector('.dialog')
    let diaH = dialog.offsetHeight
    let winH = window.innerHeight

    if (diaH < winH) {
      let margin = (winH - diaH) / 2
      dialog.style.marginTop = margin + 'px'
    } else {
      // Otherwise enable scrolling
      dialog.style.marginTop = '2%'
      dialog.style.marginBottom = '2%'
    }
  }

  /**
    * Closes the dialog.
    * @return {ZettlrDialog} Chainability.
    */
  close () {
    this.emit('beforeClose') // Notify listeners that the dialog will be closed.
    document.body.removeChild(this._modal)
    this._container.classList.remove('blur')
    this._modal.innerHTML = ''
    window.removeEventListener('resize', this._placeCallback)
    this.emit('afterClose') // Notify listeners that the dialog is now closed.
    return this
  }

  /**
    * Has the dialog been initialized?
    * @return {Boolean} True, if the initialization has occurred previously.
    */
  isInitialized () { return (this._modal.innerHTML !== '') }

  /**
    * Initializes the dialog. Pass the dialog and some data to load the template.
    * @param  {String}       dialog    The dialog type (i.e. template name)
    * @param  {Mixed}        [data={}] The data to be passed to the template.
    * @return {ZettlrDialog}           Chainability.
    */
  init (data = {}) {
    // It might be that data is simply an empty string
    // e.g. with CustomCSS, when the user has removed
    // it all. To prevent this case from erroing out,
    // we need to explicitly check for the only two
    // types where we really say it's not correct. If
    // no data should be passed to the dialog, leaving
    // out the argument will work perfectly.
    if (data === null || data === undefined) {
      throw new Error(trans('dialog.error.no_data', data))
    }

    // Give the extended dialogs a chance to manipulate the data prior to the
    // template rendering.
    if (this.preInit) data = this.preInit(data)

    let tpl = require('./../../../resources/templates/dialog/' + this._dialog + '.handlebars')(data)

    // It may be that something goes wrong requiring the template. In this case
    // fail silently.
    if (!tpl) {
      console.error(`Could not load template for dialog ${this._dialog}!`)
      return this.close()
    }

    this._modal.innerHTML = tpl

    return this
  }

  /**
    * Activates the event listeners.
    * @return {ZettlrDialog} Chainability.
    */
  _act () {
    // Focus the first input, if there is a form.
    let form = this._modal.querySelector('form#dialog')
    if (form !== null) {
      form.querySelector('input').select()
    }

    // Abort integration if an abort button is given
    this._modal.querySelector('#abort').addEventListener('click', (e) => { this.close() })

    // Integration of default action: If there is a data-default-action button
    // in the dialog, focus it so that the user by pressing return can immediately
    // issue the command.
    let defaultAction = this._modal.querySelector('button[data-default-action="data-default-action"]')
    if (defaultAction !== null) {
      defaultAction.focus()
    }

    // Don't bubble so that the user may click on the dialog without
    // closing the whole modal.
    this._modal.querySelector('.dialog').addEventListener('click', (e) => { e.stopPropagation() })
    this._modal.querySelector('.dialog').addEventListener('mousedown', (e) => { e.stopPropagation() })

    // Abort on mousedown (why mousedown? b/c click only triggers
    // after down AND up. So if the user mouseDOWNED on the dialog
    // e.g. to select some text, and then pulls up the mouse on
    // the modal, it'll close regardless of intent).
    this._modal.addEventListener('mousedown', (e) => { this.close() })

    // Enable tabs if there are any.
    if (this._modal.querySelector('#prefs-tabs') !== null) {
      // TODO
      $(this._modal.querySelector('.dialog')).tabs({
        // Always re-place the modal and adjust the margins.
        activate: (event, ui) => { this._place() }
      })
    }

    // Always keep the dialog centered and nice
    window.addEventListener('resize', this._placeCallback)

    // If there are any images in the tab, re-compute the size of the dialog
    // margins after the images load.
    // TODO: this._modal.addEventListener('load', 'img', (e) => { this._place() })

    // Are there any open-file-buttons? If so enable the request for a file by
    // clicking them.
    let onRequestFile = (event) => {
      const targetButton = event.target.tagName.toLowerCase() === 'clr-icon'
        ? event.target.parentElement
        : event.target
      const { requestExt, requestName, requestTarget } = targetButton.dataset

      const payload = {
        // Only one filter possible for brevity reasons
        filters: [{
          'name': requestName,
          'extensions': requestExt.includes(',')
            ? requestExt.split(',')
            : [requestExt]
        }],
        multiSel: false
      }

      // After all is done send an async callback message
      global.ipc.send('request-files', payload, (ret) => {
        // Don't update to empty paths.
        if (!ret || ret.length === 0 || ret[0] === '') return
        // Write the return value into the data-request-target of the clicked
        // button, because each button has a designated text field.
        document.querySelector(requestTarget).value = ret[0]
      })
    }

    let requestFileButtons = this._modal.querySelectorAll('.request-file')
    requestFileButtons.forEach((elem) => {
      elem.addEventListener('click', onRequestFile)
    })

    // If there is a "copy to clipboard" button, copy the data to the clipboard.
    let copyClipboardButton = this._modal.querySelector('.copy-clipboard')
    if (copyClipboardButton !== null) {
      copyClipboardButton.addEventListener('click', (event) => {
        clipboard.writeText(event.target.dataset.copyClipboard)
      })
    }

    // Tippify all elements with the respective attribute
    tippy(this._modal.querySelectorAll('[data-tippy-content]'), {
      delay: 100,
      arrow: true,
      duration: 100
    })

    // After everything is set, give the extension dialogs a chance to apply
    // additional event listeners.
    if (this.postAct) this.postAct()

    // After we are done (also included tabs and stuff), we can finally
    // detect the right margins.
    this._place()

    return this
  }

  /**
   * This function grants access to the modal object to e.g. assign classes to
   * certain elements.
   * @return {Element} The modal DOM object.
   */
  getModal () { return this._modal }
}

module.exports = ZettlrDialog
