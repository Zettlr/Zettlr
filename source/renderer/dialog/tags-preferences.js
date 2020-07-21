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

class TagsPreferences extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'tags-preferences'
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

    document.getElementById('addTagLine').addEventListener('click', (e) => {
      let taglist = document.getElementById('prefs-taglist')
      let container = document.createElement('div')

      let tagName = document.createElement('input')
      tagName.setAttribute('type', 'text')
      tagName.setAttribute('name', 'prefs-tags-name')
      tagName.setAttribute('placeholder', trans('dialog.tags.name_desc'))

      let tagColor = document.createElement('input')
      tagColor.setAttribute('type', 'color')
      tagColor.setAttribute('name', 'prefs-tags-color')
      tagColor.setAttribute('placeholder', trans('dialog.tags.color_desc'))

      let tagDesc = document.createElement('input')
      tagDesc.setAttribute('type', 'text')
      tagDesc.setAttribute('name', 'prefs-tags-desc')
      tagDesc.setAttribute('placeholder', trans('dialog.tags.desc_desc'))

      let removeButton = document.createElement('button')
      removeButton.setAttribute('onclick', 'this.parentNode.parentNode.removeChild(this.parentNode)')

      let icon = document.createElement('clr-icon')
      icon.setAttribute('shape', 'minus')
      removeButton.appendChild(icon)

      container.appendChild(tagName)
      container.appendChild(tagColor)
      container.appendChild(tagDesc)
      container.appendChild(removeButton)

      taglist.appendChild(container)
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
