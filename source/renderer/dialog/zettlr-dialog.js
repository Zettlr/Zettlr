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

// const tippy = require('tippy.js/dist/tippy-bundle.cjs.js').default
const EventEmitter = require('events')
const makeTemplate = require('../../common/zettlr-template.js')
const { clipboard } = require('electron')
const { trans } = require('../../common/lang/i18n.js')

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
    // Used to retrieve some configuration options
    this._body = $('body')
    this._container = $('#container')
    this._modal = $('<div>').addClass('modal')
    this._dialog = null // Must be overwritten by extension dialogs.
    this._statsData = []
    this._statsLabels = []
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
    this._container.addClass('blur')
    this._body.append(this._modal)

    // Activate event listeners
    return this._act()
  }

  /**
    * Place the dialog in the middle of the screen
    */
  _place () {
    // Adjust the margins
    let dialog = this._modal.find('.dialog').first()
    let diaH = dialog.outerHeight()
    let winH = $(window).innerHeight()

    if (diaH < winH) {
      let margin = (winH - diaH) / 2
      dialog.css('margin-top', margin + 'px')
    } else {
      dialog.css('margin-top', '15%') // Otherwise enable scrolling
      dialog.css('margin-bottom', '15%')
    }
  }

  /**
    * Closes the dialog.
    * @return {ZettlrDialog} Chainability.
    */
  close () {
    this.emit('beforeClose') // Notify listeners that the dialog will be closed.
    this._modal.detach()
    this._container.removeClass('blur')
    this._modal.html('')
    this.emit('afterClose') // Notify listeners that the dialog is now closed.
    return this
  }

  /**
    * Has the dialog been initialized?
    * @return {Boolean} True, if the initialization has occurred previously.
    */
  isInitialized () { return (this._modal.html() !== '') }

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

    let tpl = makeTemplate('dialog', this._dialog, data)

    // It may be that something goes wrong requiring the template. In this case
    // fail silently.
    if (!tpl) {
      console.error(`Could not load template for dialog ${this._dialog}!`)
      return this.close()
    }

    this._modal.html(tpl)

    return this
  }

  /**
    * Activates the event listeners.
    * @return {ZettlrDialog} Chainability.
    */
  _act () {
    // Focus the first input, if there is a form.
    let form = this._modal.find('form#dialog')
    form.find('input').first().select()

    // Abort integration if an abort button is given
    this._modal.find('#abort').on('click', (e) => { this.close() })

    // Integration of default action: If there is a data-default-action button
    // in the dialog, focus it so that the user by pressing return can immediately
    // issue the command.
    this._modal.find('button[data-default-action="data-default-action"]').focus()

    // Don't bubble so that the user may click on the dialog without
    // closing the whole modal.
    this._modal.find('.dialog').on('click mousedown', (e) => { e.stopPropagation() })

    // Abort on mousedown (why mousedown? b/c click only triggers
    // after down AND up. So if the user mouseDOWNED on the dialog
    // e.g. to select some text, and then pulls up the mouse on
    // the modal, it'll close regardless of intent).
    this._modal.on('mousedown', (e) => { this.close() })

    // Enable tabs if there are any.
    if (this._modal.find('#prefs-tabs').length > 0) {
      this._modal.find('.dialog').tabs({
        // Always re-place the modal and adjust the margins.
        activate: (event, ui) => { this._place() }
      })
    }

    // Always keep the dialog centered and nice
    $(window).on('resize', (e) => { this._place() })

    // If there are any images in the tab, re-compute the size of the dialog
    // margins after the images load.
    this._modal.on('load', 'img', (e) => { this._place() })

    // Are there any open-file-buttons? If so enable the request for a file by
    // clicking them.
    this._modal.find('.request-file').on('click', (event) => {
      let elem = $(event.target)
      let payload = {}
      // Only one filter possible for brevity reasons
      payload.filters = [{
        'name': elem.attr('data-request-name'),
        'extensions': elem.attr('data-request-ext').split(',')
      }]
      payload.multiSel = false

      // After all is done send an async callback message
      global.ipc.send('request-files', payload, (ret) => {
        // Don't update to empty paths.
        if (!ret || ret.length === 0 || ret[0] === '') return
        // Write the return value into the data-request-target of the clicked
        // button, because each button has a designated text field.
        $(elem.attr('data-request-target')).val(ret[0])
      })
    })

    // If there is a "copy to clipboard" button, copy the data to the clipboard.
    this._modal.find('.copy-clipboard').on('click', (event) => {
      clipboard.writeText($(event.target).attr('data-copy-clipboard'))
    })

    // Tippify all elements with the respective attribute
    global.tippy(this._modal[0].querySelectorAll('[data-tippy-content]'), {
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
   * @return {jQuery} The modal DOM object.
   */
  getModal () { return this._modal }
}

module.exports = ZettlrDialog
