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
    data.tag_list = Object.keys(data).join('\n')
    return data
  }
}

module.exports = TagCloud
