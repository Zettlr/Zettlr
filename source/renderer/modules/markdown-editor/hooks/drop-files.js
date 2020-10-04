const path = require('path')
const IMAGE_REGEXP = require('../../../../common/regular-expressions').getImageFileRE()

module.exports = (cm) => {
  cm.on('drop', (cm, event) => {
    // If the user has dropped a file onto the editor,
    // this strongly suggest they want to link it.
    try {
      let data = JSON.parse(event.dataTransfer.getData('text/x-zettlr-file'))
      let textToInsert = cm.getOption('zettlr').zettelkasten.linkStart
      textToInsert += data.id ? data.id : path.basename(data.path, path.extname(data.path))
      textToInsert += cm.getOption('zettlr').zettelkasten.linkEnd
      let linkPref = global.config.get('zkn.linkWithFilename')
      if (linkPref === 'always' || (linkPref === 'withID' && data.id)) {
        // We need to add the text after the link.
        textToInsert += ' ' + path.basename(data.path)
      }
      cm.replaceSelection(textToInsert)
    } catch (e) {
      // Error in JSON stringifying (either b/c malformed or no text)
      // --> proceed performing normally
      console.error(e)
    }

    if (event.dataTransfer.files.length > 0) {
      // In case of files being dropped, do *not* let CodeMirror handle them.
      event.codemirrorIgnore = true
      let imagesToInsert = []
      for (let x of event.dataTransfer.files) {
        if (IMAGE_REGEXP.test(x.path)) {
          imagesToInsert.push(x.path)
        }
      }
      if (imagesToInsert.length > 0) {
        let where = cm.coordsChar({ 'left': event.clientX, 'top': event.clientY })
        // Don't let Zettlr handle this because opening something Additionally
        // to images would be weird.
        event.stopPropagation()
        event.preventDefault()

        cm.setCursor(where)

        let isSingleInline = imagesToInsert.length === 1 && cm.getLine(where.line).trim() !== ''
        if (isSingleInline) {
          // Only add a single inline image
          cm.replaceSelection(`![${path.basename(imagesToInsert[0])}](${imagesToInsert[0]})`)
        } else {
          // Add all images.
          let str = '\n'
          for (let p of imagesToInsert) {
            str += `![${path.basename(p)}](${p})\n`
          }
          cm.replaceSelection(str)
        }
      }
    }
  })
}
