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

const fs = require('fs')
const path = require('path')
const tippy = require('tippy.js')
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

    let replacements = []
    switch (dialog) {
      case 'about':
        replacements.push('%PKGVER%|' + require('../package.json').version)
        replacements.push('%UUID%|' + global.config.get('uuid'))
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
        let dark = (obj.darkTheme) ? 'checked="checked"' : ''
        let snippets = (obj.snippets) ? 'checked="checked"' : ''
        let debug = (obj.debug) ? 'checked="checked"' : ''
        let autoCloseBrackets = (obj.editor.autoCloseBrackets) ? 'checked="checked"' : ''
        let exportTemp = (obj.export.dir === 'temp') ? 'checked="checked"' : ''
        let exportCwd = (obj.export.dir === 'cwd') ? 'checked="checked"' : ''
        let stripID = (obj.export.stripIDs) ? 'checked="checked"' : ''
        let stripTags = (obj.export.stripTags) ? 'checked="checked"' : ''
        let stripLinksFull = (obj.export.stripLinks === 'full') ? 'checked="checked"' : ''
        let stripLinksUnlink = (obj.export.stripLinks === 'unlink') ? 'checked="checked"' : ''
        let stripLinksNo = (obj.export.stripLinks === 'no') ? 'checked="checked"' : ''
        let mute = (obj.muteLines) ? 'checked="checked"' : ''
        let cmbStateExp = (obj.combinerState === 'expanded') ? 'checked="checked"' : ''
        let cmbStateCol = (obj.combinerState === 'collapsed') ? 'checked="checked"' : ''
        replacements.push('%DARK%|' + dark)
        replacements.push('%SNIPPETS%|' + snippets)
        replacements.push('%COMBINER_EXPANDED%|' + cmbStateExp)
        replacements.push('%COMBINER_COLLAPSED%|' + cmbStateCol)
        replacements.push('%MUTE_LINES%|' + mute)
        replacements.push('%DEBUG%|' + debug)
        replacements.push('%AUTOCLOSEBRACKETS%|' + autoCloseBrackets)
        replacements.push('%EXPORT_DEST_TEMP%|' + exportTemp)
        replacements.push('%EXPORT_DEST_CWD%|' + exportCwd)
        replacements.push('%EXPORT_STRIP_ID%|' + stripID)
        replacements.push('%EXPORT_STRIP_TAGS%|' + stripTags)
        replacements.push('%EXPORT_STRIP_LINKS_FULL%|' + stripLinksFull)
        replacements.push('%EXPORT_STRIP_LINKS_UNLINK%|' + stripLinksUnlink)
        replacements.push('%EXPORT_STRIP_LINKS_NO%|' + stripLinksNo)
        replacements.push('%PANDOC%|' + obj.pandoc)
        replacements.push('%XELATEX%|' + obj.xelatex)
        replacements.push('%ZKN_ID%|' + obj.zkn.idRE)
        replacements.push('%ZKN_LINKSTART%|' + obj.zkn.linkStart)
        replacements.push('%ZKN_LINKEND%|' + obj.zkn.linkEnd)
        replacements.push('%ZKN_IDGEN%|' + obj.zkn.idGen)
        let spellcheck = ''
        let spellcheckLabel = ''
        for (let l of obj.selectedDicts) {
          // Prevent ugly language labels in the spellchecker selection.
          spellcheckLabel = trans('dialog.preferences.app_lang.' + l)
          spellcheckLabel = (spellcheckLabel === 'dialog.preferences.app_lang.' + l) ? l : spellcheckLabel
          spellcheck += `\n<div class="selected-dict"><input type="hidden" value="${l}" name="selectedDicts" id="${l}">${spellcheckLabel}</div>`
        }
        replacements.push('%SPELLCHECK%|' + spellcheck)
        let avail = ''
        for (let l of obj.availableDicts) {
          if (obj.selectedDicts.includes(l)) {
            continue // Don't include already selected in the list.
          }
          // Prevent ugly language labels in the spellchecker selection.
          spellcheckLabel = trans('dialog.preferences.app_lang.' + l)
          spellcheckLabel = (spellcheckLabel === 'dialog.preferences.app_lang.' + l) ? l : spellcheckLabel
          avail += `\n<li data-value="${l}" class="dicts-list-item">${spellcheckLabel}</li>`
        }
        replacements.push('%AVAILABLE_DICTS%|' + avail)
        let langSelection = ''
        for (let l of obj.supportedLangs) {
          // Prevent ugly language labels in the app language selection.
          let langLabel = trans('dialog.preferences.app_lang.' + l)
          langLabel = (langLabel === 'dialog.preferences.app_lang.' + l) ? l : langLabel
          if (l === this._parent.getLocale()) {
            langSelection += `<option value="${l}" selected="selected">${langLabel}</option>`
          } else {
            langSelection += `<option value="${l}">${langLabel}</option>`
          }
        }
        replacements.push('%APP_LANG%|' + langSelection)
        replacements.push('%ATTACHMENT_EXTENSIONS%|' + obj.attachmentExtensions.join(', '))
        break

      case 'project-properties':
        let hash = obj.hash // In this case, the object also contains a hash we need.
        obj = obj.properties
        let genToc = (obj.pdf.toc) ? 'checked="checked"' : ''
        let genTitle = (obj.pdf.titlepage) ? 'checked="checked"' : ''
        let tocdepth = ''
        for (let i = 1; i < 7; i++) {
          tocdepth += `<option value="${i}" ` + ((parseInt(obj.pdf.tocDepth) === i) ? 'selected="selected"' : '') + `>${i}</option>`
        }
        let formats = ''
        for (let format of ['pdf', 'docx', 'odt', 'html']) {
          formats += `<option value="${format}"` + ((obj.format === format) ? 'selected="selected"' : '') + `>${format.toUpperCase()}</option>`
        }
        replacements.push('%FORMAT%|' + formats)
        // Project properties are a superset of the pdf preferences, so we
        // don't add a break here, because we need them as well.
        replacements.push('%PREFS_TITLE%|' + obj.title)
        replacements.push('%PROJECT_DIRECTORY%|' + this._parent.getRenderer().findObject(hash).name)
        replacements.push('%HASH%|' + hash)
        replacements.push('%GENERATE_TOC%|' + genToc)
        replacements.push('%GENERATE_TITLEPAGE%|' + genTitle)
        replacements.push('%TOCDEPTH%|' + tocdepth)
        // fall through to continue processing the more general pdf preferences
      case 'pdf-preferences':
        replacements.push('%PREFS_AUTHOR%|' + obj.pdf.author)
        replacements.push('%PREFS_KEYWORDS%|' + obj.pdf.keywords)
        replacements.push('%PREFS_TMARGIN%|' + obj.pdf.tmargin)
        replacements.push('%PREFS_RMARGIN%|' + obj.pdf.rmargin)
        replacements.push('%PREFS_BMARGIN%|' + obj.pdf.bmargin)
        replacements.push('%PREFS_LMARGIN%|' + obj.pdf.lmargin)
        replacements.push('%PREFS_MAINFONT%|' + obj.pdf.mainfont)
        replacements.push('%PREFS_FONTSIZE%|' + obj.pdf.fontsize)
        replacements.push('%PREFS_LINEHEIGHT%|' + obj.pdf.lineheight * 100) // Convert to percent
        let papertypes = ''
        for (let pt of SUPPORTED_PAPERTYPES) {
          papertypes += `<option value="${pt}"`
          if (pt === obj.pdf.papertype) {
            papertypes += ' selected="selected"'
          }
          papertypes += `>${PAPERNAMES[pt]}</option>\n`
        }
        replacements.push('%PAPERTYPES%|' + papertypes)
        let marginUnits = ''
        for (let u of ['cm', 'mm', 'pt']) {
          marginUnits += `<option value="${u}"`
          if (u === obj.pdf.margin_unit) {
            marginUnits += ' selected="selected"'
          }
          marginUnits += `>${u}</option>\n`
        }
        replacements.push('%MARGIN_UNITS%|' + marginUnits)
        let pagenumbering = ''
        for (let n of ['arabic', 'alph', 'Alph', 'roman', 'Roman', 'gobble']) {
          pagenumbering += `<option value="${n}"`
          if (n === obj.pdf.pagenumbering) {
            pagenumbering += ' selected="selected"'
          }
          pagenumbering += `>${trans('dialog.preferences.pdf.pagenumbering_' + n)}</option>\n`
        }
        replacements.push('%PAGENUMBERING%|' + pagenumbering)
        break

      case 'tags-preferences':
        let t = ''
        for (let tag of obj) {
          t += `<div><input type="text" name="prefs-tags-name" value="${tag.name}">`
          t += `<input type="color" name="prefs-tags-color" value="${tag.color}">`
          t += `<input type="text" name="prefs-tags-desc" value="${tag.desc}">`
          t += `<button type="button" onclick="$(this).parent().detach()">-</button></div>\n`
        }
        replacements.push('%TAGS%|' + t)
        break

      case 'update':
        replacements.push('%NEWVER%|' + obj.newVer)
        replacements.push('%CURVER%|' + obj.curVer)
        replacements.push('%CHANGELOG%|' + obj.changelog)
        if ($('body').hasClass('darwin')) {
          replacements.push('%RELEASEURL%|' + 'https://www.zettlr.com/download/macos?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater')
        } else if ($('body').hasClass('win32')) {
          replacements.push('%RELEASEURL%|' + 'https://www.zettlr.com/download/win32?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater')
        } else if ($('body').hasClass('linux')) {
          replacements.push('%RELEASEURL%|' + 'https://www.zettlr.com/download/linux?pk_campaign=RecurringUsers&pk_source=app&pk_medium=ZettlrUpdater')
        }
        break

      default:
        throw new DialogError(trans('dialog.error.unknown_dialog', dialog))
    }

    this._modal.html(this._get('dialog-' + dialog, replacements))

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
    * Reads and return a template file, applying replacements if given
    * @param  {String} template          The template to load
    * @param  {Array}  [replacements=[]] Replacement table for variables
    * @return {String}                   Returns the template with replaced vars.
    */
  _get (template, replacements = []) {
    let p = path.join(__dirname, 'assets', 'tpl', template + '.htm')

    try {
      fs.lstatSync(p)
    } catch (e) {
      throw new DialogError(trans('dialog.error.no_template', template))
    }

    let cnt = fs.readFileSync(p, { encoding: 'utf8' })

    // Translation-strings:
    let i18n = this._getLanguageTable(cnt)
    replacements = i18n.concat(replacements)

    // Replace variables
    for (let r of replacements) {
      r = r.split('|')
      cnt = cnt.replace(new RegExp(r[0], 'g'), r[1])
    }

    return cnt
  }

  /**
    * This function creates a replacement table for all language strings that
    * should be translated.
    * @param  {String} text The string in which i18n strings should be replaced.
    * @return {String}      The text with translation strings replaced.
    */
  _getLanguageTable (text) {
    // How it works: In the template files are replacement strings in the
    // following format:
    // %i18n.<dialog>.<stringidentifier>%
    // Benefit: We can programmatically create the array based on the
    // JSON values of trans, because the i18n-placeholder exactly matches
    // a string!

    let replacements = []

    // First find all i18n-strings
    let regex = /%i18n\.(.+?)%/g
    let result
    let i18nStrings = []
    while ((result = regex.exec(text)) != null) {
      i18nStrings.push(result[0])
    }

    for (let str of i18nStrings) {
      let langOpt = str.substr(0, str.length - 1).split('.').slice(1) // Omit first index
      let obj = global.i18n.dialog

      for (let x of langOpt) {
        // Navigate into the object
        if (obj.hasOwnProperty(x)) {
          obj = obj[x]
        } else {
          // Doesn't exist, throw back the string itself
          obj = langOpt.join('.')
          break
        }
      }
      replacements.push(str + '|' + obj)
    }

    return replacements
  }

  /**
   * This function grants access to the modal object to e.g. assign classes to certain elements.
   * @return {jQuery} The modal DOM object.
   */
  getModal () { return this._modal }
}

module.exports = ZettlrDialog
