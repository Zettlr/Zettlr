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
