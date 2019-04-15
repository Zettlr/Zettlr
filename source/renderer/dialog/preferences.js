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
const { trans } = require('../../common/lang/i18n')

class PreferencesDialog extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'preferences'
    // TODO: Implement the proceed functionality.
  }

  preInit (data) {
    for (let l of data.availableDicts) {
      if (data.selectedDicts.includes(l)) {
        // Remove already selected dictionaries from the list
        data.availableDicts.splice(data.availableDicts.indexOf(l), 1)
      }
    }
    // The template expects a simple string
    data.attachmentExtensions = data.attachmentExtensions.join(', ')

    // Determine the ability of the OS to switch to dark mode
    data.hasOSDarkMode = ['darwin', 'win32'].includes(process.platform)
    return data
  }

  postAct () {
    // Activate the form to be submitted
    let form = this._modal.find('form#dialog')
    form.on('submit', (e) => {
      e.preventDefault()
      // Give the ZettlrBody object the results
      // Form: dialog type, values, the originally passed object
      this.proceed(form.serializeArray())
    })

    // Functions for the search field of the dictionary list.
    $('.dicts-list-search').on('keyup', (e) => {
      let val = $('.dicts-list-search').val().toLowerCase()
      $('.dicts-list').find('li').each(function (i) {
        if ($(this).text().toLowerCase().indexOf(val) === -1) {
          $(this).hide()
        } else {
          $(this).show()
        }
      })
    })

    $('.dicts-list').on('click', (e) => {
      let elem = $(e.target)
      if (elem.is('li') && elem.hasClass('dicts-list-item')) {
        let selection = $(`<div class="selected-dict"><input type="hidden" value="${elem.attr('data-value')}" name="selectedDicts" id="${elem.attr('data-value')}">${elem.text()}</div>`)
        $('.selected-dictionaries').append(selection)
        elem.detach()
        $('.dicts-list-search').val('').focus().trigger('keyup') // Next search
      }
    })

    $('.selected-dictionaries').on('click', (e) => {
      let elem = $(e.target)
      if (elem.is('div') && elem.hasClass('selected-dict')) {
        let selection = $(`<li data-value="${elem.children('input').first().val()}" class="dicts-list-item">${elem.text()}</li>`)
        let length = $('.dicts-list').find('li').length
        if (length === 0) {
          $('.dicts-list').append(selection)
        } else {
          $('.dicts-list').find('li').each(function (i) {
            if ($(this).text() > elem.text()) {
              selection.insertBefore($(this))
              return false // Break out of the loop
            } else if (i === length - 1) {
              selection.insertAfter($(this))
            }
          })
        }
        elem.detach()
      }
    })
    // END searchfield functions.

    // Begin: functions for the zkn regular expression fields
    $('#reset-id-regex').on('click', (e) => {
      $('#pref-zkn-free-id').val('(\\d{14})')
    })
    $('#reset-linkstart-regex').on('click', (e) => {
      $('#pref-zkn-free-linkstart').val('[[')
    })
    $('#reset-linkend-regex').on('click', (e) => {
      $('#pref-zkn-free-linkend').val(']]')
    })
    $('#reset-id-generator').on('click', (e) => {
      $('#pref-zkn-id-gen').val('%Y%M%D%h%m%s')
    })

    // Reset the pandoc command
    $('#reset-pandoc-command').on('click', (e) => {
      $('#pandocCommand').val('pandoc "$infile$" -f markdown $outflag$ $tpl$ $toc$ $tocdepth$ $citeproc$ $standalone$ --pdf-engine=xelatex -o "$outfile$"')
    })

    $('#generate-id').on('click', (e) => {
      let id = require('../../common/zettlr-helpers.js').generateId($('#pref-zkn-id-gen').val())
      let re = new RegExp('^' + $('#pref-zkn-free-id').val() + '$')
      $('#generator-tester').text(id)
      if (re.test(id)) {
        $('#pass-check').text(trans('dialog.preferences.zkn.pass_check_yes'))
      } else {
        $('#pass-check').text(trans('dialog.preferences.zkn.pass_check_no'))
      }
    })

    // BEGIN functionality for the image constraining options
    $('#imageWidth, #imageHeight').on('input', (e) => {
      $('#preview-image-sizes').html($('#imageWidth').val() + '% &times; ' + $('#imageHeight').val() + '%')
    })
  }

  proceed (data) {
    // First remove potential error-classes
    this.getModal().find(`input`).removeClass('has-error')

    let cfg = {}

    // Standard preferences
    cfg['darkTheme'] = (data.find(elem => elem.name === 'darkTheme') !== undefined)
    cfg['snippets'] = (data.find(elem => elem.name === 'snippets') !== undefined)
    cfg['hideDirs'] = (data.find(elem => elem.name === 'hideDirs') !== undefined)
    cfg['muteLines'] = (data.find(elem => elem.name === 'muteLines') !== undefined)
    cfg['export.stripIDs'] = (data.find(elem => elem.name === 'export.stripIDs') !== undefined)
    cfg['export.stripTags'] = (data.find(elem => elem.name === 'export.stripTags') !== undefined)
    cfg['debug'] = (data.find(elem => elem.name === 'debug') !== undefined)
    cfg['checkForBeta'] = (data.find(elem => elem.name === 'checkForBeta') !== undefined)

    // Display checkboxes
    cfg['display.renderCitations'] = (data.find(elem => elem.name === 'display.renderCitations') !== undefined)
    cfg['display.renderIframes'] = (data.find(elem => elem.name === 'display.renderIframes') !== undefined)
    cfg['display.renderImages'] = (data.find(elem => elem.name === 'display.renderImages') !== undefined)
    cfg['display.renderLinks'] = (data.find(elem => elem.name === 'display.renderLinks') !== undefined)
    cfg['display.renderMath'] = (data.find(elem => elem.name === 'display.renderMath') !== undefined)
    cfg['display.renderTasks'] = (data.find(elem => elem.name === 'display.renderTasks') !== undefined)
    cfg['display.renderHTags'] = (data.find(elem => elem.name === 'display.renderHTags') !== undefined)

    cfg['editor.autoCloseBrackets'] = (data.find(elem => elem.name === 'editor.autoCloseBrackets') !== undefined)
    // Extract selected dictionaries
    cfg['selectedDicts'] = data.filter(elem => elem.name === 'selectedDicts').map(elem => elem.value)

    // Copy over all other field values from the result set.
    for (let r of data) {
      // Only non-missing to not overwrite the checkboxes that ARE checked with a "yes"
      if (!cfg.hasOwnProperty(r.name)) {
        // Convert numbers to prevent validation errors.
        if (!isNaN(r.value) && r.value !== '') r.value = Number(r.value)
        cfg[r.name] = r.value
      }
    }

    // Now finally the attachment extensions.
    if (cfg.hasOwnProperty('attachmentExtensions')) {
      let attachments = cfg['attachmentExtensions'].split(',')
      for (let i = 0; i < attachments.length; i++) {
        attachments[i] = attachments[i].trim().replace(/[\s]/g, '')
        if (attachments[i].length < 2) {
          attachments.splice(i, 1)
          i--
          continue
        }
        if (attachments[i].charAt(0) !== '.') {
          attachments[i] = '.' + attachments[i]
        }
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

    // Finally send and close this dialog.
    global.ipc.send('update-config', cfg)
    this.close()
  }
}

module.exports = PreferencesDialog
