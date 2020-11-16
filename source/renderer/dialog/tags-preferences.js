/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagsPreferences class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class lets you manage your special coloured tags.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')
const validate = require('../../common/validate.js')
const { trans } = require('../../common/lang/i18n')
const serializeFormData = require('../../common/util/serialize-form-data')
const renderTemplate = require('../util/render-template')

class TagsPreferences extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'tags-preferences'
  }

  get addTagButton () {
    return document.getElementById('addTagLine')
  }

  get tagListContainer () {
    return document.getElementById('prefs-taglist')
  }

  postAct () {
    // Activate the form to be submitted
    let form = this._modal.querySelector('form#dialog')
    form.addEventListener('submit', (e) => {
      e.preventDefault()
      // Give the ZettlrBody object the results
      // Form: dialog type, values, the originally passed object
      this.proceed(serializeFormData(form))
    })

    this.addTagButton.addEventListener('click', (event) => {
      this.tagListContainer.appendChild(renderTemplate(
        `<div>
            <input type="text" name="prefs-tags-name" placeholder="${trans('dialog.tags.name_desc')}">
            <input type="color" name="prefs-tags-color" placeholder="${trans('dialog.tags.color_desc')}">
            <input type="text" name="prefs-tags-desc" placeholder="${trans('dialog.tags.desc_desc')}">
            <button type="button" onclick="this.parentElement.parentElement.removeChild(this.parentElement)">-</button>
        </div>`
      ))
    })
  }

  proceed (data) {
    let cfg = {}
    let tags = {
      'name': data.filter(elem => elem.name === 'prefs-tags-name').map(elem => elem.value.toLowerCase()),
      'color': data.filter(elem => elem.name === 'prefs-tags-color').map(elem => elem.value),
      'desc': data.filter(elem => elem.name === 'prefs-tags-desc').map(elem => elem.value)
    }
    cfg['tags'] = []
    for (let i = 0; i < tags.name.length; i++) {
      cfg['tags'].push({ 'name': tags.name[i], 'color': tags.color[i], 'desc': tags.desc[i] })
    }

    // Validate dat shit.
    let unvalidated = validate(cfg)

    if (unvalidated.length > 0) {
      // For brevity reasons only show one at a time (they have to be resolved either way)
      this._dialog.getModal().find('.error-info').text(unvalidated[0].reason)
      for (let prop of unvalidated) {
        // Indicate which ones were wrong.
        this._dialog.getModal().find(`input[name="${prop.key}"]`).first().addClass('has-error')
      }
      return // Don't try to update falsy settings.
    }

    // Send and close
    global.ipc.send('update-tags', cfg['tags'])
    this.close()
  }
}

module.exports = TagsPreferences
