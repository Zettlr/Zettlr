/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PreferencesDialog class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class ensures all the preferences of Zettlr can be
 *                  customised to your likings.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')
const validate = require('../../common/validate.js')
const { ipcRenderer } = require('electron')
const { trans } = require('../../common/lang/i18n')
const generateId = require('../../common/util/generate-id')
const renderTemplate = require('../util/render-template')
const serializeFormData = require('../../common/util/serialize-form-data')

class PreferencesDialog extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'preferences'
    this._boundCallback = this.afterDownload.bind(this)
    this._textTimeout = null
  }

  get spinner () {
    return renderTemplate(
      `<div class="sk-three-bounce">
        <div class="sk-child sk-bounce1"></div>
        <div class="sk-child sk-bounce2"></div>
        <div class="sk-child sk-bounce3"></div>
      </div>`
    )
  }

  preInit (data) {
    // The template expects a simple string
    data.attachmentExtensions = data.attachmentExtensions.join(', ')

    // Determine the ability of the OS to switch to dark mode
    data.hasOSDarkMode = [ 'darwin', 'win32' ].includes(process.platform)

    data.languages = [] // Initialise
    // Make sure the languages are unique and
    // the duplicates (internal + external files)
    // are removed from the array.
    for (let l of data.supportedLangs) {
      if (!data.languages.find(e => e.bcp47 === l)) {
        data.languages.push({
          'bcp47': l,
          'completion': 100,
          'toDownload': false
        })
      }
    }

    for (let lang of data.availableLanguages) {
      // If the language is already in the supportedLangs, we can jump over them
      if (!data.languages.find(elem => elem.bcp47 === lang.bcp47)) {
        let x = lang
        x.toDownload = true
        data.languages.push(x)
      }
    }
    this._languages = data.languages // Save a reference for downloading etc.

    // Now prepopulate some stuff for autoCorrect
    data.autoCorrectReplacements = []
    for (let replacement of data.editor.autoCorrect.replacements) {
      data.autoCorrectReplacements.push({ 'key': replacement.key, 'value': replacement.val })
    }

    // For ease of access in Handlebars, we also need to provide it with the current
    // quotes
    let q = data.editor.autoCorrect.quotes
    if (!q) {
      data.primaryQuotes = '"…"'
      data.secondaryQuotes = "'…'"
    } else {
      data.primaryQuotes = q.double.start + '…' + q.double.end
      data.secondaryQuotes = q.single.start + '…' + q.single.end
    }

    return data
  }

  get appLangElement () {
    return document.getElementById('app-lang')
  }

  get appLang () {
    return this.appLangElement.value
  }

  getLanguageOptionElement (language) {
    return this.appLangElement.querySelector(`option[value="${language}"]`)
  }

  get downloadIndicatorElement () {
    return document.getElementById('app-lang-download-indicator')
  }

  postAct () {
    // Activate the form to be submitted
    let form = this._modal.querySelector('form#dialog')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      // Give the ZettlrBody object the results
      this.proceed(serializeFormData(form))
    })

    // Download not-available languages on select
    this.appLangElement.addEventListener('change', (event) => {
      let l = this._languages.find(elem => elem.bcp47 === this.appLang)
      if (l.toDownload) {
        let langLocalisation = trans('dialog.preferences.translations.downloading', trans(`dialog.preferences.app_lang.${l.bcp47}`))
        // How does downloding work? Easy:
        // 1. Block the element itself
        // 2. Notify the user that a language will be downloaded
        // 3. Tell the main process to download the language
        // 4. Wait for the one IPC event announcing the download (or error)
        // 5. Notify the user of the successful download
        // 6. Unblock the element
        this.appLangElement.disabled = true
        // Indicate downloading both on the element itself ...
        const language = this.getLanguageOptionElement(l.bcp47)
        language.textContent = langLocalisation
        // Override the option's value to ensure even if the user saves during
        // download no non-available language is set.
        language.value = global.config.get('appLang')
        // ... and beneath the select
        this.downloadIndicatorElement.textContent = langLocalisation
        this.downloadIndicatorElement.append(this.spinner)
        // Notify main
        global.ipc.send('request-language', l.bcp47)
        ipcRenderer.on('message', this._boundCallback) // Listen for the back event
      }
    })

    const dictionariesSearchField = document.querySelector('.dicts-list-search')
    // Functions for the search field of the dictionary list.
    dictionariesSearchField.addEventListener('keyup', (e) => {
      const searchFor = dictionariesSearchField.value.toLowerCase()
      document.querySelectorAll('.dicts-list li').forEach((element) => {
        element.innerText.toLowerCase().includes(searchFor)
          ? $(element).show()
          : $(element).hide()
      })
    })

    $('.dicts-list').on('click', (e) => {
      // If the user simply clicks anywhere on the li (and not on the label),
      // switch the checkbox state via javascript
      let elem = $(e.target)
      if (elem.is('li') && elem.hasClass('dicts-list-item')) {
        let cb = elem.find('input[type="checkbox"]').first()
        cb.prop('checked', !cb.prop('checked'))
      }
    })
    // END searchfield functions.

    // Remove the list items on click
    $('.user-dict-item').on('click', (e) => {
      let elem = $(e.target)
      elem.animate({
        'height': '0px'
      }, 500, function () {
        $(this).detach()
      })
    })

    // Begin: functions for the zkn regular expression fields
    const zknFreeIdElement = document.getElementById('pref-zkn-free-id')
    $('#reset-id-regex').on('click', (e) => {
      zknFreeIdElement.value = '(\\d{14})'
    })
    $('#reset-linkstart-regex').on('click', (e) => {
      document.getElementById('pref-zkn-free-linkstart').value = '[['
    })
    $('#reset-linkend-regex').on('click', (e) => {
      document.getElementById('pref-zkn-free-linkend').value = ']]'
    })
    const zknIdGenElement = document.getElementById('pref-zkn-id-gen')
    $('#reset-id-generator').on('click', (e) => {
      zknIdGenElement.value = '%Y%M%D%h%m%s'
    })

    // Reset the pandoc command
    $('#reset-pandoc-command').on('click', (e) => {
      document.getElementById('pandocCommand').value = 'pandoc "$infile$" -f markdown $outflag$ $tpl$ $toc$ $tocdepth$ $citeproc$ $standalone$ --pdf-engine=xelatex --mathjax -o "$outfile$"'
    })

    const reportTestResult = (resultTranslationKey) => {
      document.getElementById('pass-check').textContent = trans(resultTranslationKey)
    }
    $('#generate-id').on('click', (e) => {
      const idPattern = zknIdGenElement.value
      const idMatcher = zknFreeIdElement.value
      const id = generateId(idPattern)
      const re = new RegExp(`^${idMatcher}$`)
      document.getElementById('generator-tester').textContent = id

      if (re.test(id)) {
        reportTestResult('dialog.preferences.zkn.pass_check_yes')
      } else {
        reportTestResult('dialog.preferences.zkn.pass_check_no')
      }
    })

    // BEGIN functionality for the image constraining options
    $('#imageWidth, #imageHeight').on('input', (e) => {
      const width = document.getElementById('imageWidth').value
      const height = document.getElementById('imageHeight').value
      $('#preview-image-sizes').html(`${width}% &times; ${height}%`)
    })

    // BEGIN functionality for theme switching
    $('.theme-mockup').on('click', function (e) {
      let elem = $(this).attr('data-theme')
      // Simply send the respective command to main and let the magic happen!
      global.ipc.send(`switch-theme-${elem}`)
    })

    // BEGIN functionality for the AutoCorrect options
    $('#add-autocorrect-key').click(function (e) {
      e.stopPropagation()
      e.preventDefault()
      let keyCol = $('<td>').html('<div class="input-button-group"><input type="text" name="autoCorrectKeys[]"></div>')
      let valCol = $('<td>').html('<div class="input-button-group"><input type="text" name="autoCorrectValues[]"> <button class="autocorrect-remove-row"><clr-icon shape="times"></clr-icon></button></div>')
      let row = $('<tr>').append(keyCol, valCol)
      $('#autocorrect-key-container').append(row)
    })

    $('#autocorrect-key-container').on('click', '.autocorrect-remove-row', function (e) {
      e.preventDefault()
      $(e.target).parent().parent().parent().detach() // Button -> div -> td -> tr
    })

    $('.mq-select').click(function (e) {
      e.preventDefault()
      let primary = e.target.dataset.primary
      let secondary = e.target.dataset.secondary

      $('#autoCorrectQuotesDouble')[0].options.selectedIndex = primary
      $('#autoCorrectQuotesSingle')[0].options.selectedIndex = secondary
    })
  }

  afterDownload (event, arg) {
    if (!arg.hasOwnProperty('command') || arg.command !== 'language-download') return
    // Detach this event listener
    ipcRenderer.off('message', this._boundCallback)
    let cnt = arg.content
    let langLocalisation = trans(`dialog.preferences.app_lang.${cnt.bcp47}`)

    // Tell success or failure and unlock the select
    if (cnt.success) {
      this.downloadIndicatorElement.textContent = trans('dialog.preferences.translations.success', langLocalisation)
      this.getLanguageOptionElement(global.config.get('appLang')).textContent = langLocalisation
      // Again override the value to the correct one.
      this.getLanguageOptionElement(global.config.get('appLang')).value = cnt.bcp47
    } else {
      // Do not override the language value to make sure the language stays
      // even if the user doesn't select another language.
      this.downloadIndicatorElement.textContent = trans('dialog.preferences.translations.error', langLocalisation)
      this.getLanguageOptionElement(cnt.bcp47).textContent = trans('dialog.preferences.translations.not_available', langLocalisation)
    }
    this.appLangElement.disabled = false // Unblock
    if (this._textTimeout) clearTimeout(this._textTimeout)
    this._textTimeout = setTimeout(() => {
      // Hide the text after three seconds
      this.downloadIndicatorElement.textContent = ''
    }, 3000)
  }

  proceed (data) {
    // First remove potential error-classes
    for (const element of this.getModal().querySelectorAll('input')) {
      element.classList.remove('has-error')
    }

    let cfg = {}

    // Standard preferences
    cfg['darkTheme'] = (data.find(elem => elem.name === 'darkTheme') !== undefined)
    cfg['fileMeta'] = (data.find(elem => elem.name === 'fileMeta') !== undefined)
    cfg['hideDirs'] = (data.find(elem => elem.name === 'hideDirs') !== undefined)
    cfg['alwaysReloadFiles'] = (data.find(elem => elem.name === 'alwaysReloadFiles') !== undefined)
    cfg['muteLines'] = (data.find(elem => elem.name === 'muteLines') !== undefined)
    cfg['export.stripIDs'] = (data.find(elem => elem.name === 'export.stripIDs') !== undefined)
    cfg['export.stripTags'] = (data.find(elem => elem.name === 'export.stripTags') !== undefined)
    cfg['debug'] = (data.find(elem => elem.name === 'debug') !== undefined)
    cfg['checkForBeta'] = (data.find(elem => elem.name === 'checkForBeta') !== undefined)
    cfg['enableRMarkdown'] = (data.find(elem => elem.name === 'enableRMarkdown') !== undefined)
    cfg['window.nativeAppearance'] = (data.find(elem => elem.name === 'window.nativeAppearance') !== undefined)
    cfg['newFileDontPrompt'] = (data.find(elem => elem.name === 'newFileDontPrompt') !== undefined)

    // Display checkboxes
    cfg['display.renderCitations'] = (data.find(elem => elem.name === 'display.renderCitations') !== undefined)
    cfg['display.renderIframes'] = (data.find(elem => elem.name === 'display.renderIframes') !== undefined)
    cfg['display.renderImages'] = (data.find(elem => elem.name === 'display.renderImages') !== undefined)
    cfg['display.renderLinks'] = (data.find(elem => elem.name === 'display.renderLinks') !== undefined)
    cfg['display.renderMath'] = (data.find(elem => elem.name === 'display.renderMath') !== undefined)
    cfg['display.renderTasks'] = (data.find(elem => elem.name === 'display.renderTasks') !== undefined)
    cfg['display.renderHTags'] = (data.find(elem => elem.name === 'display.renderHTags') !== undefined)
    cfg['display.useFirstHeadings'] = (data.find(elem => elem.name === 'display.useFirstHeadings') !== undefined)

    cfg['editor.autoCloseBrackets'] = (data.find(elem => elem.name === 'editor.autoCloseBrackets') !== undefined)
    cfg['editor.homeEndBehaviour'] = (data.find(elem => elem.name === 'editor.homeEndBehaviour') !== undefined)
    cfg['editor.enableTableHelper'] = (data.find(elem => elem.name === 'editor.enableTableHelper') !== undefined)
    cfg['editor.countChars'] = (data.find(elem => elem.name === 'editor.countChars') !== undefined)
    cfg['editor.autoCorrect.active'] = (data.find(elem => elem.name === 'editor.autoCorrect.active') !== undefined)
    cfg['editor.rtlMoveVisually'] = (data.find(elem => elem.name === 'editor.rtlMoveVisually') !== undefined)
    cfg['zkn.autoCreateLinkedFiles'] = (data.find(elem => elem.name === 'zkn.autoCreateLinkedFiles') !== undefined)

    cfg['watchdog.activatePolling'] = (data.find(elem => elem.name === 'watchdog.activatePolling') !== undefined)

    // Extract selected dictionaries
    cfg['selectedDicts'] = data.filter(elem => elem.name === 'selectedDicts').map(elem => elem.value)

    // Now for the AutoCorrect preferences - first the replacement table
    let keys = data.filter((e) => e.name === 'autoCorrectKeys[]')
    let vals = data.filter((e) => e.name === 'autoCorrectValues[]')
    cfg['editor.autoCorrect.replacements'] = []
    for (let i = 0; i < keys.length; i++) {
      cfg['editor.autoCorrect.replacements'].push({ key: keys[i].value, val: vals[i].value })
    }

    // And then second the quotes. We split them at the hyphen character
    // (so we only) need to maintain one instance of these things.
    let prim = data.find(elem => elem.name === 'autoCorrectQuotesDouble').value.split('…')
    let sec = data.find(elem => elem.name === 'autoCorrectQuotesSingle').value.split('…')
    if (prim[0] === '"' && prim[1] === '"' && sec[0] === "'" && sec[1] === "'") {
      // If defaults are selected, disable Magic Quotes
      cfg['editor.autoCorrect.quotes'] = false
    } else {
      cfg['editor.autoCorrect.quotes'] = {
        'double': { 'start': prim[0], 'end': prim[1] },
        'single': { 'start': sec[0], 'end': sec[1] }
      }
    }

    // Copy over all other field values from the result set.
    for (let r of data) {
      // Only non-missing to not overwrite the checkboxes that ARE checked with a "yes"
      if (!cfg.hasOwnProperty(r.name)) {
        // Convert numbers to prevent validation errors.
        if (!isNaN(r.value) && r.value.trim() !== '') r.value = Number(r.value)
        cfg[r.name] = r.value
      }
    }

    // Now finally the attachment extensions.
    if (cfg.hasOwnProperty('attachmentExtensions')) {
      let attachments = cfg['attachmentExtensions'].split(',')
      for (let i = 0; i < attachments.length; i++) {
        attachments[i] = attachments[i].trim().replace(/\s/g, '')
        if (attachments[i].length < 2) {
          attachments.splice(i, 1)
          i--
          continue
        }
        if (attachments[i].charAt(0) !== '.') {
          attachments[i] = '.' + attachments[i]
        }

        // Convert to lower case
        attachments[i] = attachments[i].toLowerCase()
      }
      cfg['attachmentExtensions'] = attachments
    }

    // Validate dat shit.
    let unvalidated = validate(cfg)

    if (unvalidated.length > 0) {
      // For brevity reasons only show one at a time (they have to be resolved either way)
      this.getModal().find('.error-info').text(unvalidated[0].reason)
      for (let prop of unvalidated) {
        // Indicate which ones were wrong.
        this.getModal().find(`input[name="${prop.key}"]`).first().addClass('has-error')
      }
      return // Don't try to update falsy settings.
    }

    // We're done. But before sending retrieve all remaining user dictionary words ...
    let userDictionary = data.filter(elem => elem.name === 'userDictionary' && elem.value.length > 0).map(elem => elem.value)
    // ... and send them to main separately
    global.ipc.send('update-user-dictionary', userDictionary)

    // Finally send and close this dialog.
    global.ipc.send('update-config', cfg)
    this.close()
  }
}

module.exports = PreferencesDialog
