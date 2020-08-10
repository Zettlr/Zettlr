/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TagCloud class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This dialog lets you review all your tags inside your files.
 *
 * END HEADER
 */

const ZettlrDialog = require('./zettlr-dialog.js')

class TagCloud extends ZettlrDialog {
  constructor () {
    super()
    this._dialog = 'tag-cloud'
  }

  preInit (data) {
    data.tags = Object.keys(data).map(key => data[key])
    data.tag_list = Object.keys(data).map(e => '#' + e).join('\n')
    return data
  }

  postAct () {
    // Activate searches on click on the spans
    $('span.tag').click((evt) => {
      let elem = $(evt.target)
      // TODO: Don't access the renderer element via window
      window.renderer.autoSearch(elem.attr('data-tag'))
      this.close()
    })

    const tagSearch = document.getElementById('filter-tags')
    tagSearch.addEventListener('keyup', (evt) => {
      const tag = tagSearch.value.toLowerCase()
      let remainingTags = []
      document.querySelectorAll('.dialog .tag').forEach((element) => {
        if (element.textContent.toLowerCase().includes(tag)) {
          $(element).show()
          remainingTags.push(element.dataset.tag)
        } else {
          $(element).hide()
        }
      })

      $('.dialog #copy-to-clipboard').attr('data-copy-clipboard', remainingTags.join('\n'))
    })
  }
}

module.exports = TagCloud
