/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDialog class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class displays big modals on the app.
 *
 * END HEADER
 */

const tippy = require('tippy.js')
const makeTemplate = require('../common/zettlr-template.js')
const Chart = require('chart.js')
const { trans } = require('../common/lang/i18n.js')
const SUPPORTED_PAPERTYPES = require('../common/data.json').papertypes
const PAPERNAMES = require('../common/data.json').papernames

/**
 * Dialog errors may occur.
 * @param       {String} [msg=''] An additional error message.
 * @constructor
 */
function DialogError (msg = '') {
  this.name = trans('dialog.error.name')
  this.message = trans('dialog.error.message', msg)
}

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
class ZettlrDialog {
  /**
    * Prepare the dialog
    * @param {Mixed} [parent=null] The containing object
    */
  constructor (parent = null) {
    // Used to retrieve some configuration options
    this._parent = parent
    this._body = $('body')
    this._container = $('#container')
    this._modal = $('<div>').addClass('modal')
    this._dlg = null
    this._statsData = []
    this._statsLabels = []
  }

  /**
    * Opens a dialog after it has been initialized
    * @return {ZettlrDialog} Chainability.
    */
  open () {
    if (!this.isInitialized()) {
      throw new DialogError(trans('dialog.error.no_init'))
    }

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
    this._modal.detach()
    this._container.removeClass('blur')
    this._modal.html('')
    this._dlg = null
    return this
  }

  /**
    * Has the dialog been initialized?
    * @return {Boolean} True, if the initialization has occurred previously.
    */
  isInitialized () {
    return (this._dlg !== null)
  }

  /**
    * Initializes the dialog.
    * @param  {String} dialog     The dialog type (i.e. template name)
    * @param  {Mixed} [obj={}] An object representing things to be replaced
    * @return {ZettlrDialog}            Chainability.
    */
  init (dialog, obj = {}) {
    // POSSIBLE DIALOGS:
    // preferences
    // about

    if (!obj) {
      throw new DialogError(trans('dialog.error.no_data', obj))
    }

    this._dlg = dialog

    // Some preparations for the dialogs
    switch (dialog) {
      case 'about':
        obj.version = require('../package.json').version
        obj.uuid = global.config.get('uuid')
        break

      case 'statistics':
        this._statsData = []
        this._statsLabels = []
        for (let key in obj) {
          this._statsLabels.push(key)
          this._statsData.push(obj[key])
        }
        break

      case 'preferences':
        for (let l of obj.availableDicts) {
          if (obj.selectedDicts.includes(l)) {
            // Remove already selected dictionaries from the list
            obj.availableDicts.splice(obj.availableDicts.indexOf(l), 1)
          }
        }
        // The template expects a simple string
        obj.attachmentExtensions = obj.attachmentExtensions.join(', ')
        break

      case 'project-properties':
        let hash = obj.hash
        obj = obj.properties
        obj.hash = hash
        obj.availableTocLevels = ['1', '2', '3', '4', '5', '6']
        obj.availableExportFormats = ['pdf', 'docx', 'odt', 'html']
        obj.projectDirectory = this._parent.getRenderer().findObject(obj.hash).name
        // Project properties are a superset of the pdf preferences, so we
        // don't add a break here, because we need them as well.
        // fall through to continue processing the more general pdf preferences
      case 'pdf-preferences':
        obj.pdf.lineheight = obj.pdf.lineheight * 100
        obj.supportedPapertypes = SUPPORTED_PAPERTYPES
        obj.papertypeNames = PAPERNAMES
        obj.availableMarginUnits = ['cm', 'mm', 'pt']
        obj.availablePageNumberingSystems = ['arabic', 'alph', 'Alph', 'roman', 'Roman', 'gobble']
        break

      case 'tags-preferences':
        break

      case 'update':
        obj.downloadLink = 'https://www.zettlr.com/download/?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater'
        if ($('body').hasClass('darwin')) {
          obj.downloadLink = 'https://www.zettlr.com/download/macos?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater'
        } else if ($('body').hasClass('win32')) {
          obj.downloadLink = 'https://www.zettlr.com/download/win32?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater'
        } else if ($('body').hasClass('linux')) {
          obj.downloadLink = 'https://www.zettlr.com/download/linux?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater'
        }
        break

      default:
        throw new DialogError(trans('dialog.error.unknown_dialog', dialog))
    }

    let tpl = makeTemplate('dialog', dialog, obj)

    // It may be that something goes wrong requiring the template. In this case
    // fail silently.
    if (!tpl) {
      console.error(`Could not load template for dialog ${dialog}!`)
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
    // Select the "untitled"-content
    let form = this._modal.find('form#dialog')
    form.find('input').first().select()

    // Activate the form to be submitted
    form.on('submit', (e) => {
      e.preventDefault()
      // Give the ZettlrBody object the results
      // Form: dialog type, values, the originally passed object
      this._parent.proceed(this._dlg, form.serializeArray())
    })

    // Abort integration if an abort button is given
    this._modal.find('#abort').on('click', (e) => {
      this.close()
    })

    // Don't bubble so that the user may click on the dialog without
    // closing the whole modal.
    this._modal.find('.dialog').on('click', (e) => { e.stopPropagation() })

    // Abort on click
    this._modal.on('click', (e) => { this.close() })

    // Tabbify all dialogs mentioned in the TAB_DIALOGS list.
    if (this._modal.find('#prefs-tabs').length > 0) {
      this._modal.find('.dialog').tabs({
        // Always re-place the modal and adjust the margins.
        activate: (event, ui) => { this._place() }
      })
    }

    // Always keep the dialog centered and nice
    $(window).on('resize', (e) => {
      this._place()
    })

    // If there are any images in the tab, re-compute the size of the dialog
    // margins after the images load.
    this._modal.on('load', 'img', (e) => {
      this._place()
    })

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
        console.log(ret)
        // Write the return value into the data-request-target of the clicked
        // button, because each button has a designated text field.
        $(elem.attr('data-request-target')).val(ret[0])
      })
    })

    // After we are done (also included tabs and stuff), we can finally
    // detect the right margins.
    this._place()

    // Tippify all elements with the respective attribute
    tippy('[data-tippy-content]', {
      delay: 100,
      arrow: true,
      duration: 100,
      flip: true
    })

    // Initiate the chartJS
    if ($('#canvas').length > 0) {
      let config = {
        type: 'line',
        data: {
          labels: this._statsLabels,
          datasets: [{
            label: trans('dialog.statistics.words'),
            backgroundColor: 'rgba( 28, 178, 126, 1)',
            borderColor: 'rgba( 28, 178, 126, 1)',
            data: this._statsData,
            fill: false
          }]
        },
        options: {
          elements: { line: { tension: 0 } },
          responsive: true,
          title: { display: true, text: trans('dialog.statistics.words_per_day') },
          tooltips: { mode: 'index', intersect: false },
          hover: { mode: 'nearest', intersect: true },
          scales: {
            xAxes: [{ display: true, scaleLabel: { display: true, labelString: trans('dialog.statistics.day') } }],
            yAxes: [{ display: true, scaleLabel: { display: true, labelString: trans('dialog.statistics.words') } }]
          },
          onResize: () => { this._place() }
        }
      }
      this._chart = new Chart(document.getElementById('canvas').getContext('2d'), config)
    } // END initiate canvas

    return this
  }

  /**
   * This function grants access to the modal object to e.g. assign classes to certain elements.
   * @return {jQuery} The modal DOM object.
   */
  getModal () { return this._modal }
}

module.exports = ZettlrDialog
