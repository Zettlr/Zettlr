const path = require('path')
const IMAGE_REGEXP = require('../../../../common/regular-expressions').getImageFileRE()

module.exports = (cm) => {
  cm.on('drop', (cm, event) => {
    // If the user has dropped a file from the manager onto the editor,
    // this strongly suggest they want to link it using their preferred method.
    if (event.dataTransfer.getData('text/x-zettlr-file') !== '') {
      let data = JSON.parse(event.dataTransfer.getData('text/x-zettlr-file'))
      let textToInsert = cm.getOption('zettlr').zettelkasten.linkStart
      textToInsert += data.id ? data.id : path.basename(data.path, path.extname(data.path))
      textToInsert += cm.getOption('zettlr').zettelkasten.linkEnd
      let linkPref = global.config.get('zkn.linkWithFilename')
      if (linkPref === 'always' || (linkPref === 'withID' && data.id)) {
        // We need to add the text after the link.
        textToInsert += ' ' + path.basename(data.path)
      }

      // We have to set the cursor to the appropriate coordinates
      let cursor = cm.coordsChar({ top: event.clientY, left: event.clientX })
      cm.setSelection(cursor)
      cm.replaceSelection(textToInsert)
      cm.focus() // Makes working with the text easier
    }

    if (event.dataTransfer.files.length > 0) {
      // In case of files being dropped, do *not* let CodeMirror or the
      // paste-image hook handle them.
      event.codemirrorIgnore = true
      event.stopPropagation()
      event.preventDefault()

      const where = cm.coordsChar({ 'left': event.clientX, 'top': event.clientY })
      cm.setCursor(where)
      const basePath = cm.getOption('zettlr').markdownImageBasePath

      const filesToAdd = []

      for (let file of event.dataTransfer.files) {
        // For each file, see if it's an image or not. If not, simply link,
        // if it's an image, make one out of it. The difference is exactly one
        // character, so piece of cake.

        const relativePath = path.relative(basePath, file.path)

        if (IMAGE_REGEXP.test(file.path)) {
          filesToAdd.push(`![${path.basename(file.path)}](${relativePath})`)
        } else {
          filesToAdd.push(`[${path.basename(file.path)}](${relativePath})`)
        }
      }

      cm.replaceSelection(filesToAdd.join('\n'))
    } // END: if dataTransfer.files.length
  })
}
